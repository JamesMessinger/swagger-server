'use strict';

module.exports = Handlers;

var _         = require('lodash');
var path      = require('path');
var fs        = require('fs');
var dirSearch = require('directory-search');

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
  //Retrieve an array of all .js files and their associated paths in the ./handlers directory
  //TODO: Add a setting to the express instance to allow the user to override the default 'handlers' directory

  //Does the ./handlers directory exist?
  fs.stat(path.join(this.currentApi.baseDir, 'handlers'), function(err, stats) {
    if(!err && stats.isDirectory()) {
      dirSearch(path.join(self.currentApi.baseDir, 'handlers'), '.js', function(err, paths){
        //TODO: Look at the swagger routes defined first and then attempt to load the handler files
        paths.forEach(function(handlePath) {
          if(moduleExists.call(self, handlePath)) {
            //retrieve the http verbs defined in the handler files and then add to the swagger server
            var handleVerbs = require(handlePath);

            //TODO: 1) Check for swagger verb keys after loading
            //      2) Check the verb export to make sure it's a function or an array
            //      3) If it's an array and each item in the array should be a function if it's not then EMIT not THROW an error

            //Get the route path by removing the ./handlers and the .js file extension
            var routePath = handlePath.replace(/.*\/handlers/, '');
            routePath = routePath.replace(/\.js/, '');

            //TODO: Use Swagger API to find out what properties to check for
            //TODO: Use utils.swaggerMethods to check for the supported swagger methods

            if(handleVerbs['get']) {
              //self.server.get(routePath, handleVerbs['get']);
              self.server.get(routePath, handleVerbs['get']);
            }

            if(handleVerbs['post']) {
              self.server.post(routePath, handleVerbs['post']);
            }

            if(handleVerbs['put']) {
              self.server.put(routePath, handleVerbs['put']);
            }

            if(handleVerbs['delete']) {
              self.server.delete(routePath, handleVerbs['delete']);
            }

            if(handleVerbs['patch']) {
              self.server.patch(routePath, handleVerbs['patch']);
            }
          }
        });

        //TODO: Create error handling
        self.server.emit('handled', '', paths);
      });
    }
  });
};


function moduleExists(name) {
  //TODO: Check that the file exists before trying to require it.
  try {
    require.resolve(path.resolve(name));
  }
  catch (err){
    this.server.emit('error', err);
    return false;
  }
  return true;
}
