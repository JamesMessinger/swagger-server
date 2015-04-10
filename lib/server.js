'use strict';

module.exports = SwaggerServer;

var _                 = require('lodash'),
    express           = require('express'),
    EventEmitter      = require('events').EventEmitter,
    application       = require('./application'),
    SwaggerMiddleware = require('swagger-express-middleware'),
    SwaggerParser     = require('./parser'),
    SwaggerWatcher    = require('./watcher');


/**
 * The Swagger Server class, which wraps an Express Application and extends it.
 *
 * @param {e.application} [app]  An Express Application. If not provided, a new app is created.
 * @constructor
 * @extends EventEmitter
 */
function SwaggerServer(app) {
    app = app || express();

    // Event Emitter
    _.extend(this, EventEmitter.prototype);
    EventEmitter.call(this);

    /**
     * @type {Middleware}
     * @protected
     */
    this.__middleware = new SwaggerMiddleware(app);

    /**
     * @type {SwaggerParser}
     * @protected
     */
    this.__parser = new SwaggerParser(this);

    /**
     * @type {SwaggerWatcher}
     * @protected
     */
    this.__watcher = new SwaggerWatcher(this);

    /**
     * The Express Application.
     * @type {e.application}
     */
    this.app = app;

    /**
     * Parses the given Swagger API.
     *
     * @param {string|object} swagger
     * The file path or URL of a Swagger 2.0 API spec, in YAML or JSON format.
     * Or a valid Swagger API object (see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#swagger-object).
     *
     * @param {function} [callback]
     * function(err, api, metadata)
     */
    this.parse = function(swagger, callback) {
        this.__parser.parse(swagger);

        if (_.isFunction(callback)) {
            this.__parser.whenParsed(callback);
        }
    };

    // Patch the Express app to support Swagger
    application.patch(this);
}
