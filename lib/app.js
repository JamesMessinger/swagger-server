'use strict';

module.exports = App;

var express = require('express'),
    http    = require('http'),
    _       = require('lodash'),
    util    = require('./util');


/* istanbul ignore next: empty constructor */
/**
 * Extends an Express application
 * @constructor
 * @extends e.application
 */
function App() {}


/**
 * Initializes the App
 * @private
 */
App.prototype.__init = function() {
    var self = this;

    /**
     * The Express application
     * @type {e.application}
     * @private
     */
    self.__express = express();

    // Bind the "enabled" and "disabled" methods directly the Express application
    ['enabled', 'disabled'].forEach(function(method) {
        self[method] = self.__express[method].bind(self.__express);
    });

    // Default settings
    self.enable('watch files');
    self.enable('mock');
    self.enable('CORS');
};


['enable', 'disable', 'set'].forEach(function(method) {
    /**
     * Pass-through to Express's settings methods, but emits an event whenever a setting is changed.
     *
     * @param   {string}    name        The setting name.  If it doesn't exist, it will be created.
     * @param   {*}         [value]     The setting value. Only applicable for the `set` method.
     * @returns {SwaggerServer}
     */
    App.prototype[method] = function(name, value) {
        // Track the old/new value of the setting
        var oldValue = this.__express.get(name);
        this.__express[method].apply(this.__express, arguments);
        var newValue = this.__express.get(name);

        // If it changed, then emit the "set" event
        if (oldValue !== newValue) {
            this.emit('set', name, newValue, oldValue);
        }

        return this;
    };
});



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
    var args = _.isNumber(port) ? _.drop(arguments, 1) : _.drop(arguments, 0);

    var httpServer = http.createServer(self);

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
        httpServer.listen.apply(httpServer, [port].concat(args));
    });

    return httpServer;
};


/**
 * Alias of {@link App#listen}.
 * @type {Function}
 * @returns {http.Server}
 */
App.prototype.start = App.prototype.listen;
