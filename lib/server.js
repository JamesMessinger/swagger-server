'use strict';

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var url = require('url');
var http = require('http');
var https = require('https');
var _ = require('lodash');
var parser = require('swagger-parser');
var debug = require('./helpers/debug');
var util = require('./helpers/util');
var SwaggerRouter = require('./router');


module.exports = SwaggerServer;


/**
 * A RESTful API server, powered by Swagger and Express.
 *
 * This server is unapologetically strict and does not allow any
 * requests or responses that are not declared in your Swagger spec.
 * This encourages a "design-driven" approach to RESTful services,
 * in which your spec is the sole source of truth.  It also ensures
 * that your spec, documentation, and implementation are all complete,
 * accurate, and unambiguous.
 *
 * This server can be used standalone, or can be mounted as
 * middleware on another Node/Connect/Express server by using the
 * {@link SwaggerServer#middleware} property.
 *
 * @param {string} swaggerFile
 * The path of a Swagger spec file (JSON or YAML)
 *
 * @param {settings} [settings]
 * Sets the corresponding properties of the {@link SwaggerServer#settings} property.
 *
 * @constructor
 * @extends SwaggerRouter
 */
function SwaggerServer(swaggerFile, settings) {
    var self = this;

    if (_.isEmpty(swaggerFile)) {
        throw util.createError('The "swaggerFile" parameter is required');
    }

    if (!self) {
        throw util.createError('The "new" operator is required when creating a SwaggerServer instance');
    }

    // Call the base class constructor
    SwaggerRouter.apply(self, [settings]);

    // Clone the "state" property for this instance
    self.state = _.clone(SwaggerServer.prototype.state);

    // Bind the "middleware" function to this instance
    self.middleware = SwaggerServer.prototype.middleware.bind(self);

    /** @private */
    self.__swaggerFile = swaggerFile;
}


// Inheritance
SwaggerServer.prototype = Object.create(SwaggerRouter.prototype);
SwaggerServer.prototype.constructor = SwaggerServer;
_.extend(SwaggerServer.prototype, EventEmitter.prototype);


/**
 * The current state of Swagger-Server.
 */
SwaggerServer.prototype.state = {
    /**
     * The Swagger Object (https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#swagger-object-).
     * This property is null until the `specLoaded` event has fired.
     * @type {Object|null}
     */
    swagger: null,

    /**
     * The URL at which Swagger-Server is running.
     * This property is null until the server has started.
     * @type {Url|null}
     */
    url: null,

    /**
     * The date/time at which Swagger-Server started running.
     * This property is null until the server has started.
     * @type {Date|null}
     */
    started: null,

    /**
     * The date/time at which the current Swagger spec was loaded.
     * This property is null until the `specLoaded` event has fired.
     * @type {Date|null}
     */
    specLoaded: null,

    /**
     * If there was an error parsing the Swagger spec,
     * then this property contains that error. Otherwise, this property is null.
     * @type {Error|null}
     */
    error: null,

    /**
     * The paths of the Swagger spec and any files that are referenced by it.
     * @type {string[]}
     */
    files: [],

    /**
     * The URLs of the Swagger spec and any URLs that are referenced by it.
     * @type {url.Url[]}
     */
    urls: []
};


/**
 * Creates an HTTP or HTTPS server, depending on the "schemes" setting in the Swagger spec
 * and begins listening for requests.  If both HTTP and HTTPS schemes are defined in the spec,
 * then Swagger-Server will choose HTTPS if you you can pass the `options` parameter, or
 * HTTP if you don't pass the `options` parameter.
 *
 * If the `host` property in the Swagger spec includes a port number, then that port number
 * is used. Otherwise, the `defaultPort` parameter is used.
 *
 * @param {integer} [defaultPort]
 * The port number to use (if one is not specified in the Swagger spec).
 *
 * @param {object}  [sslOptions]
 * If the Swagger spec defines the HTTPS scheme, then this parameter is passed directly to
 * the {@link https#createServer} method.  This allows you to specify your SSL key and certificate.
 *
 * @param {function} [callback]
 * An optional callback function that will be invoked once the server is started.  It will be passed the
 * {@link http.server} or {@link https.server} object;
 *
 * @returns {SwaggerServer}
 */
SwaggerServer.prototype.start = function start(defaultPort, sslOptions, callback) {
    var self = this;

    // shift args if needed
    if (_.isPlainObject(defaultPort)) {
        callback = sslOptions;
        sslOptions = defaultPort;
        defaultPort = undefined;
    }
    else if (_.isFunction(defaultPort)) {
        callback = defaultPort;
        defaultPort = undefined;
        sslOptions = undefined;
    }
    else if (_.isFunction(sslOptions)) {
        callback = sslOptions;
        sslOptions = undefined;
    }

    // Parse the Swagger spec, so we can get the info we need to start the self.
    self.__ensureParsed(function(err, swagger) {
        if (err) {
            return doCallback(callback, util.createError('Swagger-Server cannot start due to the following error(s): \n%s', err));
        }

        if (self.__starting || self.__started) {
            // NOTE: Calling `start()` multiple times is an error, not a no-op
            // Otherwise, users could expect that calling `start()` again with different params
            // could change the port number, turn on/off SSL, etc.
            return doCallback(callback, util.createError('Swagger-Server is already running. It cannot be started again.'));
        }

        if (self.__stopped) {
            // The server cannot be restarted once stopped
            return doCallback(callback, serverIsStoppedError());
        }

        self.__starting = true;

        // Start the HTTP server
        self.__startHttpServer(defaultPort, sslOptions, function(err, httpServer) {
            if (err) {
                return doCallback(callback, err);
            }

            self.__starting = false;

            // Fire the "start" event
            self.__emitStart();

            // Pass the HTTP server to the callback
            doCallback(callback, null, httpServer);
        });
    });

    return self;
};


/**
 * Alias of {@link SwaggerServer#start}.
 * @type {Function}
 * @returns {SwaggerServer}
 */
SwaggerServer.prototype.listen = SwaggerServer.prototype.start;


/**
 * Stops the server, closes the port, removes event listeners, and frees memory.
 * Once the server has been stopped, it cannot be restarted,
 * but you can start a new server instance on the same port.
 *
 * @param {function} [callback]
 * an optional callback function that will be invoked once the server is stopped.
 *
 * @returns {SwaggerServer}
 */
SwaggerServer.prototype.stop = function stop(callback) {
    var self = this;
    var async = false;

    try {
        if (!self.__stopped) {
            // Stop the router
            SwaggerRouter.prototype.stop.apply(self);

            // Stop watching files
            self.__unwatchFiles();

            // Close the HTTP server
            // NOTE: If Swagger-Server is being used as middleware in a larger Express app, then we can't close it.
            if (self.__httpServer) {
                async = true;
                self.__httpServer.removeAllListeners('close');
                self.__httpServer.close(callback);
                self.__httpServer = null;
            }
        }

        // If there are no async operations, then invoke the callback immediately
        if (callback && !async) {
            setImmediate(callback);
        }
    }
    catch (e) {
        setImmediate(doCallback, callback, e);
    }
    finally {
        self.state.swagger = null;
        self.state.url = null;
        self.state.started = null;
        self.state.specLoaded = null;
        self.state.error = null;
        self.state.files = [];
        self.state.urls = [];
        self.__stopped = true;
    }

    return self;
};


/**
 * Alias of {@link SwaggerServer#stop}.
 * @type {Function}
 * @returns {SwaggerServer}
 */
SwaggerServer.prototype.close = SwaggerServer.prototype.stop;


/**
 * A middleware function that can be used in an Express/Connect application.
 * @type {function}
 */
SwaggerServer.prototype.middleware = function middleware(req, res, next) {
    var self = this;
    var args = arguments;

    if (self.__stopped) {
        // The server has been stopped, so no more requests are allowed
        doCallback(next, serverIsStoppedError());
    }
    else if (self.__started) {
        // The server's already running, so just pass the request along to the Router
        SwaggerRouter.prototype.middleware.apply(self, args);
    }
    else {
        // Swagger-Server is being run as part of a larger Express app, and this is the first request.
        // So we need to do one-time startup logic before handling the request.
        self.__ensureParsed(function(err, swagger) {
            if (err) {
                doCallback(next, err);
            }
            else {
                // Fire the "start" event
                self.__emitStart();

                // Now that the server is started, pass the request along to the Router
                SwaggerRouter.prototype.middleware.apply(self, args);
            }
        });
    }
};


/**
 * Creates an HTTP (or HTTPS) server, using the settings from the Swagger spec.
 *
 * @param   {integer}   defaultPort
 * The default port number. Only used if there is no port specified in the Swagger spec.
 *
 * @param   {object}    sslOptions
 * If HTTPS is used, then this object is passed directly to {@link https#createServer}.
 *
 * @param   {function}  callback
 */
SwaggerServer.prototype.__startHttpServer = function startHttpServer(defaultPort, sslOptions, callback) {
    var self = this;
    var swagger = self.state.swagger;

    // Get the port number from the Swagger spec
    var port = defaultPort;
    var host = swagger.host || '';
    var hostMatches = host.match(/[^:]+(?:\:(\d+))?$/); // ['hostname', 'port']
    if (hostMatches && hostMatches.length === 2) {
        port = parseInt(hostMatches[1]);
    }

    // Determine which scheme to use
    var scheme = 'http';
    if (swagger.schemes && swagger.schemes.indexOf('https') >= 0 && sslOptions) {
        scheme = 'https';
    }

    // Create the server
    debug('Starting %s server', scheme);
    var httpServer;
    if (scheme === 'http') {
        httpServer = http.createServer(self.middleware);
    }
    else {
        httpServer = https.createServer(sslOptions, self.middleware);
    }

    // Start the server
    httpServer.listen(port);
    httpServer.once('listening', function(err) {
        // The server has successfully started, so remove the error listener
        httpServer.removeAllListeners('error');
        debug('%s server started', scheme);

        // Stop Swagger-Server if the HTTP server is shut down
        httpServer.on('close', self.stop.bind(self, _.noop));

        // Update state
        self.state.url = url.parse(scheme + '://localhost:' + httpServer.address().port);
        self.__httpServer = httpServer;

        callback(null, httpServer);
    });

    // This is the only way to know if the `httpServer.listen` method fails
    httpServer.once('error', function() {
        callback(util.createError(
            'The %s server failed to start. Make sure port %d is not already in use.', scheme, port));
    });
};


/**
 * Parses the Swagger spec, and then invokes the given callback.
 * @private
 */
SwaggerServer.prototype.__ensureParsed = function ensureParsed(callback) {
    try {
        this.__parse();
        this.once('specLoaded', callback);
    }
    catch (e) {
        callback(e);
    }
};


/**
 * Reloads the Swagger file and updates the SwaggerServer's state accordingly.
 * @private
 */
SwaggerServer.prototype.__parse = function parse() {
    var self = this;

    if (self.__parsing) {
        return;
    }
    if (self.__stopped) {
        throw serverIsStoppedError();
    }

    self.__parsing = true;
    parser.parse(self.__swaggerFile, function(err, swagger, metadata) {
        if (err) {
            self.__setError(err, 'An error occurred while parsing the Swagger file');
        }
        else {
            // Update the state object
            self.__setError();
            self.state.specLoaded = new Date();
            self.state.swagger = swagger;
            self.state.files = metadata.files;
            self.state.urls = metadata.urls;

            // Stop watching the old files, and watch the new ones
            self.__unwatchFiles();
            self.__watchFiles();
        }

        self.__parsing = false;
        self.emit('specLoaded', err, swagger);
    });
};


/**
 * Monitors the given files for changes, and triggers the "specChange" event.
 * @private
 */
SwaggerServer.prototype.__watchFiles = function watchFiles() {
    var self = this;

    self.__fileWatchers = self.__fileWatchers || [];
    self.state.files.forEach(function(file) {
        var watcher = fs.watch(file, {persistent: false}, onChange);
        watcher.on('error', self.__setError.bind(self));
        self.__fileWatchers.push(watcher);
    });

    function onChange() {
        try {
            self.emit('specChange');
            self.__parse();
        }
        catch (e) {
            self.__setError(e);
        }
    }
};


/**
 * Stops any current file watchers.
 * @private
 */
SwaggerServer.prototype.__unwatchFiles = function unwatchFiles() {
    var self = this;

    if (self.__fileWatchers) {
        self.__fileWatchers.forEach(function(watcher) {
            watcher.close();
        });
        self.__fileWatchers = null;
    }
};


/**
 * Sets the server's "started" state, and fires the "start" event.
 * @private
 */
SwaggerServer.prototype.__emitStart = function emitStart() {
    var self = this;

    if (!self.__started) {
        if (self.state.url) {
            debug('Swagger-Server is now running at %s', self.state.url.href);
        }

        self.__started = true;
        self.state.started = new Date();
        self.emit('start');
    }
};


/**
 * Sets (or clears) the server's error state.
 * @param   {Error}     [err]
 * @param   {string}    [message]
 */
SwaggerServer.prototype.__setError = function setError(err, message) {
    if (err) {
        if (!_.isString(message)) {
            message = '';
        }

        err = util.createError(message + ': \n' + err.name + ': ' + err.message + ' \n' + err.stack);
        console.warn(err.message);
        this.state.error = err;
    }
    else {
        this.state.error = null;
    }
};


/**
 * Invokes an optional error-first callback.
 * If the callback is not defined and there is an error, then the error is thrown.
 * @param   {function}      callback
 * @param   {Error|null}    [err]
 * @param   {*}             [data]
 */
function doCallback(callback, err, data) {
    if (_.isFunction(callback)) {
        callback.apply(null, _.rest(arguments));
    }
    else if (err) {
        throw err;
    }
}


/**
 * Creates a "Server has been stopped" error
 */
function serverIsStoppedError() {
    return util.createError('Swagger-Server has been stopped and cannot handle any further requests');
}
