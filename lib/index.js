'use strict';

var _                 = require('lodash'),
    express           = require('express'),
    router            = require('./router'),
    util              = require('./util'),
    SwaggerServer     = require('./server'),
    handlers          = require('./handlers'),
    SwaggerMiddleware = require('swagger-express-middleware');

module.exports = _.extend(createApplication, express);
module.exports.Server = SwaggerServer;
module.exports.Router = createRouter;
module.exports.Route = Route;
module.exports.DataStore = SwaggerMiddleware.DataStore;
module.exports.MemoryDataStore = SwaggerMiddleware.MemoryDataStore;
module.exports.FileDataStore = SwaggerMiddleware.FileDataStore;
module.exports.Resource = SwaggerMiddleware.Resource;
module.exports.handlers = handlers;

/**
 * Creates an Express Application and patches it to support Swagger.
 *
 * @param {string|object} [swagger]
 * The file path or URL of a Swagger 2.0 API spec, in YAML or JSON format.
 * Or a valid Swagger API object (see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#swagger-object).
 *
 * @returns {e.application}
 */
function createApplication(swagger) {
  var server = new SwaggerServer();
  server.parse(swagger);
  return server.app;
}

/**
 * Creates an Express Router and patches it to support Swagger.
 * @returns {e.Router}
 */
function createRouter() {
  var rtr = express.Router.apply(express, arguments);
  router.patch(rtr);
  return rtr;
}

/**
 * Extends the Express Route class to support Swagger.
 * @param {string} path
 * @constructor
 * @extends {e.Route}
 */
function Route(path) {
  // Convert Swagger-style path to Express-style path
  path = path.replace(util.swaggerParamRegExp, ':$1');
  express.Route.call(this, path);
}

// Inheritance
Route.prototype = Object.create(express.Route.prototype);
Route.prototype.constructor = Route;
