'use strict';

module.exports = SwaggerParser;

var util         = require('./util'),
    path         = require('path'),
    EventEmitter = require('events').EventEmitter;

/**
 * Parses a Swagger API.
 *
 * @param {SwaggerServer} server
 * @constructor
 */
function SwaggerParser(server) {
  this.server = server;
  this.isParsing = false;
  this.isParsed = false;
}

/**
 * Parses the given Swagger API.
 *
 * @param {string|object} [swagger]
 * The file path or URL of a Swagger 2.0 API spec, in YAML or JSON format.
 * Or a valid Swagger API object (see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#swagger-object).
 */
SwaggerParser.prototype.parse = function(swagger) {
  var self = this;

  //TODO: Figure out a way to access the basePath in the self.swagger variable.
  self.swagger = swagger = swagger || self.swagger;   // parse is called without params by SwaggerWatcher

  if (self.isParsing) {
    return;
  }

  util.debug('Parsing Swagger file "%s"', swagger);
  self.isParsed = false;
  self.isParsing = true;
  self.server.__middleware.init(swagger, function(err, middleware, api, parser) {
    self.isParsing = false;
    self.isParsed = true;
    self.err = err;
    self.api = api;
    self.parser = parser;

    if (err) {
      err.status = 500;
      util.warn(err);

      // Don't emit the "error" event unless there are listeners;
      // otherwise, Node will throw an Error
      if (EventEmitter.listenerCount(self.server, 'error') > 0) {
        self.server.emit('error', err);
      }
    }

    //f Emit a "parsed" event, regardless of whether there was an error
    util.debug('Done parsing Swagger file "%s"', swagger);

    var basePath = path.dirname(swagger);
    self.server.emit('parsed', err, api, parser, basePath);
  });
};

/**
 * Calls the given function when parsing is complete, or immediately if parsing is already complete.
 *
 * @param {function} callback   function(err, api, parser)
 */
SwaggerParser.prototype.whenParsed = function(callback) {
  if (this.isParsed) {
    callback.call(null, this.err, this.api, this.parser);
  }
  else {
    this.server.once('parsed', function(err, api, parser) {
      callback.call(null, err, api, parser);
    });
  }
};
