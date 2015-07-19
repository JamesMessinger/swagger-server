'use strict';

module.exports = Handlers;

var _         = require('lodash'),
    path      = require('path'),
    fs        = require('fs'),
    dirSearch = require('directory-search'),
    nodeUtil  = require('util'),
    util      = require('./util');


/**
 * The Handler class, correlates the swagger paths with the handlers directory structure and adds the d
 * custom logic to the Express instance.
 * @param server
 * @constructor
 */

function Handlers(server) {
  var self = this;
  this.server = server;

  //Store the most recently parsed swagger data for when only the handlers get re-attached.
  this.currentMetaData = {};
  this.currentApi = {};
  this.server.on('parsed', function(err, metadata, api) {
    self.currentMetaData = metadata;
    self.currentApi = api;
    self.setupHandlers();
  });
}

/**
 * Add the handlers to the Swagger Express instance.
 */
Handlers.prototype.setupHandlers = function() {
  var self = this;

  //Does the 'handlers path' directory exist?
  fs.stat(path.join(this.currentApi.baseDir, self.server.app.get('handlers path')), function(err, stats) {
    if(!err && stats.isDirectory()) {
      //Retrieve an array of all .js files and their associated paths in the ./handlers directory
      dirSearch(path.join(self.currentApi.baseDir, self.server.app.get('handlers path')), '.js', function(err, paths){

        //Take the current swagger paths and parse them to what the correct Swaggerize Express format should be
        var formattedPaths = Object.keys(self.currentMetaData.paths).map(function(swaggerPath) {
          return path.join(self.currentApi.baseDir, self.server.app.get('handlers path'), swaggerPath + '.js');
        });

        //compares the swagger with the actual /handlers directory and finds the matching sets
        var matchingPaths =  _.intersection(paths, formattedPaths);

        //Loop through the matching paths and attempt to load the http verbs into the Express Server
        matchingPaths.forEach(function(handlePath) {
          addPathToExpress(self, handlePath)
        });

        self.server.emit('handled', '', paths);
      });
    }
  });
};

/**
 * Add the handlePath to the Swagger Express server if valid
 * @param handlePath
 */
function addPathToExpress(handlerObj, handlePath) {
  var self = handlerObj;
  //Check to make sure that the module exists and will load properly to what node expects
  if(moduleExists.call(this, handlePath)) {
    //retrieve the http verbs defined in the handler files and then add to the swagger server
    var handleVerbs = require(handlePath);

    //Get the route path by removing the ./handlers and the .js file extension
    //TODO: Use path names to get these
    var routePath = handlePath.replace(/.*\/handlers/, '');
    routePath = routePath.replace(/\.js/, '');

    util.swaggerMethods.forEach(function(method){
      if(handleVerbs[method] && validSwaggerize(self, handleVerbs[method])) {
        self.server[method](routePath, handleVerbs[method]);
      }
    });
  }
}

/**
 * The exported modules inside the ./handlers directory, or whatever the 'handlers path' setting is set to
 * should follow the standard set by the Swaggerize Express project (https://github.com/krakenjs/swaggerize-express).
 * @param verbExport
 * @returns {boolean}
 */
function validSwaggerize(handlerObj, verbExport) {
  var self = handlerObj;
  if(_.isFunction(verbExport)){
    return true;
  }
  //If the verbExport is an array then each item in the array should be a function, if not then emit an error.
  else if(_.isArray(verbExport)) {
    verbExport.forEach(function(item){
      if(!_.isFunction(item)) {
        //TODO: Do further testing of this error format line.
        self.server.emit('error', nodeUtil.format('Invalid swaggerize method %s', item));
        return false;
      }
    });
  }

  return true;
}

/**
 * Check to see if the provided name is a valid node module.
 * @param name
 * @returns {boolean}
 */
function moduleExists(name) {
  //TODO: Check that the file exists before trying to require it.
  try {
    require.resolve(name);
  }
  catch (err){
    this.server.emit('error', err);
    return false;
  }
  return true;
}
