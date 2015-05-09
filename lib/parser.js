'use strict';

module.exports = SwaggerParser;

var util         = require('./util'),
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
  self.swagger = swagger = swagger || self.swagger;   // parse is called without params by SwaggerWatcher

  if (self.isParsing) {
    return;
  }

  util.debug('Parsing Swagger file "%s"', swagger);
  self.isParsed = false;
  self.isParsing = true;
  self.server.__middleware.init(swagger, function(err, middleware, api, metadata) {
    self.isParsing = false;
    self.isParsed = true;
    self.err = null;
    self.api = null;
    self.metadata = null;

    if (err) {
      err.status = 500;
      util.warn(err);

      // Don't emit the "error" event unless there are listeners;
      // otherwise, Node will throw an Error
      if (EventEmitter.listenerCount(self.server, 'error') > 0) {
        self.server.emit('error', err);
      }
    }

    // Emit a "parsed" event, regardless of whether there was an error
    util.debug('Done parsing Swagger file "%s"', swagger);
    self.server.emit('parsed', err, api, metadata);
  });
};

/**
 * Calls the given function when parsing is complete, or immediately if parsing is already complete.
 *
 * @param {function} callback   function(err, api, metadata)
 */
SwaggerParser.prototype.whenParsed = function(callback) {
  if (this.isParsed) {
    callback.call(null, this.err, this.api, this.metadata);
  }
  else {
    this.server.once('parsed', function(err, api, metadata) {
      callback.call(null, err, api, metadata);
    });
  }
};
