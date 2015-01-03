'use strict';

var express = require('express');
var http = require('http');
var _ = require('lodash');
var util = require('./util');


module.exports = SwaggerApp;


/**
 * Extends an Express application to support Swagger paths
 *
 * @param {SwaggerServer} swaggerServer
 * The SwaggerServer that's managing the application.
 *
 * @constructor
 * @extends e.Express
 */
function SwaggerApp(swaggerServer) {
    var self = this;

    /**
     * The SwaggerServer that's managing this SwaggerApp
     * @type {SwaggerServer}
     */
    self.swaggerServer = swaggerServer;

    /**
     * If {@link SwaggerApp#listen} is called, then this is the HTTP server instance.
     * This property will remain null if the SwaggerApp is being mounted to an existing Express app.
     * @type {http.Server|null}
     */
    self.httpServer = null;

    /**
     * The Express application
     * @type {e.Express}
     */
    self.app = express();

    // Wrap Express's functions with SwaggerApp wrappers
    Object.keys(SwaggerApp.prototype).forEach(function(fn) {
        self.app[fn] = SwaggerApp.prototype[fn].bind(self);
    });

    // Return the Express app, not the SwaggerApp instance
    return self.app;
}


/**
 * Wraps Express's `handle` method, and delays HTTP requests
 * until the Swagger file has been parsed and the middleware has been initialized.
 */
SwaggerApp.prototype.handle = function handle(req, res, next) {
    var self = this;

    // Delay the request until SwaggerServer is ready
    self.swaggerServer.whenReady(function() {
        express.application.handle.call(self.app, req, res, next);
    });
};


/**
 * Starts listening for connections.  This method is identical Node's {@link http.Server#listen},
 * except that the port number is optional.  If no port number is given, then the port number in
 * the Swagger API will be used.
 *
 * @param   {number} [port]
 * @returns {http.Server}
 */
SwaggerApp.prototype.listen = function listen(port) {
    var self = this;
    var args = _.rest(arguments);

    self.__createServer();

    self.swaggerServer.whenReady(function(api, metadata) {
        if (!_.isNumber(port)) {
            // No port number was provided, so get it from the Swagger API
            var host = api ? api.host || '' : '';
            var hostMatches = host.match(/[^:]+(?:\:(\d+))?$/); // ['hostname', 'port']
            if (hostMatches && hostMatches.length === 2) {
                port = parseInt(hostMatches[1]);
            }
        }

        util.debug('Starting HTTP server');
        self.httpServer.listen.apply(self.httpServer, [port].concat(args));
    });

    return self.httpServer;
};


/**
 * Alias of {@link SwaggerApp#listen}.
 * @type {Function}
 * @returns {SwaggerApp}
 */
SwaggerApp.prototype.start = SwaggerApp.prototype.listen;


/**
 * Stops listening for connections and closes the port.
 *
 * @param {function} [callback]
 * An optional callback function that will be invoked once the server is stopped.
 */
SwaggerApp.prototype.close = function close(callback) {
    if (this.httpServer) {
        this.httpServer.close(callback);
    }
    else {
        this.app.emit('close');
        setImmediate(callback);
    }
};


/**
 * Alias of {@link SwaggerApp#close}.
 * @type {Function}
 * @returns {SwaggerApp}
 */
SwaggerApp.prototype.stop = SwaggerApp.prototype.close;


/**
 * Creates the {@link SwaggerApp.httpServer}, if it doesn't already exist.
 */
SwaggerApp.prototype.__createServer = function createServer() {
    var self = this;

    if (!self.httpServer) {
        self.httpServer = http.createServer(self.app);

        // If any errors occur on the HTTP server, then report it via SwaggerServer
        self.httpServer.on('error', self.swaggerServer.setError.bind(self.swaggerServer));

        // Emit a "listening" event whenever the HTTP server is restarted
        self.httpServer.on('listening', function() {
            self.app.emit('listening', self.httpServer);
            util.debug('Swagger-Server is now running at http://localhost:%d', self.httpServer.address().port);
        });

        // Emit a "close" event whenever the HTTP server is stopped
        self.httpServer.on('close', function() {
            self.app.emit('close', self.httpServer);
            util.debug('Swagger-Server has been stopped');
        });
    }
};
