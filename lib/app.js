'use strict';

module.exports = App;

var express = require('express');
var http = require('http');
var _ = require('lodash');
var util = require('./util');

/**
 * Extends an Express application
 * @constructor
 * @extends e.Express
 */
function App() {}


/**
 * Initializes the App
 * @private
 */
App.prototype.__init = function() {
    var self = this;

    /**
     * If {@link App#listen} is called, then this is the HTTP server instance.
     * If SwaggerServer is being mounted to an existing Node/Express/Connect app,
     * @type {http.Server|null}
     * @private
     */
    self.__httpServer = null;

    /**
     * The Express application
     * @type {e.Express}
     * @private
     */
    self.__express = express();

    // Expose select Express methods on SwaggerServer
    ['enable', 'disable', 'enabled', 'disabled'].forEach(function(method) {
        self[method] = self.__express[method].bind(self.__express);
    });

    // Default settings
    self.enable('watch files');
    self.enable('use stubs');
    self.enable('CORS');
};


/**
 * Starts listening for connections.  This method is identical Node's {@link http.Server#listen},
 * except that the port number is optional.  If no port number is given, then the port number in
 * the Swagger API will be used.
 *
 * @param   {number}    [port]
 * @param   {string}    [hostname]
 * @param   {number}    [backlog]
 * @param   {function}  [callback]
 * @returns {http.Server}
 */
App.prototype.listen = function(port, hostname, backlog, callback) {
    var self = this;
    var args = _.rest(arguments);

    self.__ensureHttpServer();

    // Wait until parsing is done
    self.__whenParsed(function(api, metadata) {
        if (!_.isNumber(port)) {
            // No port number was provided, so get it from the Swagger API
            var host = api ? api.host || '' : '';
            var hostMatches = host.match(/[^:]+(?:\:(\d+))?$/); // ['hostname', 'port']
            if (hostMatches && hostMatches.length === 2) {
                port = parseInt(hostMatches[1]);
            }
        }

        util.debug('Starting HTTP server');
        self.__httpServer.listen.apply(self.__httpServer, [port].concat(args));
    });

    return self.__httpServer;
};


/**
 * Alias of {@link App#listen}.
 * @type {Function}
 * @returns {App}
 */
App.prototype.start = App.prototype.listen;


/**
 * Stops listening for connections and closes the port.
 *
 * @param {function} [callback]
 * An optional callback function that will be invoked once the server is stopped.
 */
App.prototype.close = function(callback) {
    callback = callback || _.noop;
    
    if (this.__httpServer) {
        this.__httpServer.close(callback);
        this.__httpServer = null;
    }
    else {
        this.emit('close');
        setImmediate(callback);
    }
};


/**
 * Alias of {@link App#close}.
 * @type {Function}
 * @returns {App}
 */
App.prototype.stop = App.prototype.close;


/**
 * Creates the {@link App.__httpServer}, if it doesn't already exist.
 * @private
 */
App.prototype.__ensureHttpServer = function __ensureHttpServer() {
    var self = this;

    if (!self.__httpServer) {
        self.__httpServer = http.createServer(self);

        // If any errors occur on the HTTP server, then emit it via SwaggerServer
        self.__httpServer.on('error', function(err) {
            err = util.newError(err, 'Swagger-Server\'s internal HTTP server encountered an error');
            self.emit('error', err);
        });

        // Emit a "listening" event whenever the HTTP server is restarted
        self.__httpServer.on('listening', function() {
            self.emit('listening', self.__httpServer);
            var address = self.__httpServer && self.__httpServer.address();
            if (address) {
                util.debug('Swagger-Server is now running at http://localhost:%d', address.port);
            }
        });

        // Emit a "close" event whenever the HTTP server is stopped
        self.__httpServer.on('close', function() {
            var httpServer = self.__httpServer;
            self.__httpServer = null;
            self.emit('close', httpServer);
            util.debug('Swagger-Server has been stopped');
        });
    }
};
