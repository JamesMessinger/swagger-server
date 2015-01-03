'use strict';

var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var parser = require('swagger-parser');
var SwaggerApp = require('./app');
var middleware = require('./middleware');
var util = require('./util');


module.exports = SwaggerServer;


/**
 * An Express application with Swagger middleware.
 *
 * @param {string} swaggerPath
 * The path of a Swagger spec file (JSON or YAML)
 *
 * @constructor
 */
function SwaggerServer(swaggerPath) {
    // Clone the "state" property to this instance
    this.state = _.clone(SwaggerServer.prototype.state);

    /** @type {SwaggerApp} */
    this.app = new SwaggerApp(this);

    // Parse the file and initialize the middleware
    this.init(swaggerPath);
}


/**
 * The current state of Swagger-Server.
 */
SwaggerServer.prototype.state = {
    /**
     * Is the server ready to handle requests?
     * This will be false until the Swagger file has been parsed and the middleware has been initialized.
     * @type {boolean}
     */
    ready: false,

    /**
     * If the server is in an error state (such as a parsing error), then this will be the error.
     * @type {Error|null}
     */
    error: null,

    /**
     * The parsed Swagger API
     * @type {SwaggerObject|null}
     */
    api: null,

    /**
     * Metadata about the Swagger API
     * @type {object|null}
     */
    metadata: null
};


/**
 * Parses the Swagger file and initializes middleware.
 *
 * @param {string} swaggerPath
 * The path of a Swagger spec file (JSON or YAML)
 */
SwaggerServer.prototype.init = function init(swaggerPath) {
    var self = this;

    parser.parse(swaggerPath, function(err, api, metadata) {
        // Update state
        self.state.api = api;
        self.state.metadata = metadata;
        self.setError(err);

        self.addMiddleware(api);

        util.debug('Swagger-Server is ready');
        self.state.ready = true;
        self.app.emit('ready', api, metadata);
    });
};


/**
 * Adds Express middleware for the given Swagger API.
 *
 * @param {SwaggerObject} api
 */
SwaggerServer.prototype.addMiddleware = function addMiddleware(api) {
    this.app.use(middleware.poweredBy);

    if (this.state.error) {
        this.app.use(middleware.error(this.state.error));
    }
    else {
        this.app.use(function(req, res, next) {
            res.sendStatus(404);
        });
    }
};


/**
 * Calls the given function once the Swagger file has been parsed and the middleware has been initialized.
 *
 * @param {function} callback
 * @private
 */
SwaggerServer.prototype.whenReady = function whenReady(callback) {
    var self = this;

    if (self.state.ready) {
        callback.call(null, self.state.api, self.state.metadata);
    }
    else {
        self.app.once('ready', function(api, metadata) {
            callback.call(null, api, metadata);
        });
    }
};


/**
 * Sets or clears the {@link SwaggerServer.state.error} property.
 * @param {Error|null} err
 */
SwaggerServer.prototype.setError = function(err) {
    this.state.error = err;

    if (err) {
        err.status = err.status || 500;

        // If there are no error listeners, then write the error to stderr.
        // This way, the server keeps running and can report the error to clients
        if (EventEmitter.listenerCount(this.app, 'error') === 0) {
            util.warn(err);
        }
        else {
            this.app.emit('error', err);
        }
    }

};
