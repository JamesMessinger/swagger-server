'use strict';

var debug = require('./helpers/debug');
var format = require('util').format;
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var url = require('url');
var http = require('http');
var https = require('https');
var express = require('express');
var _ = require('lodash');
var parser = require('swagger-parser');
var swaggerMethods = require('./helpers/swagger-methods');
var CORS = require('./middleware/CORS.js');
var response = require('./middleware/mock/response');
var errors = require('./errors');
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
 * the path of a Swagger spec file (JSON or YAML)
 *
 * @param {settings} [settings]
 * sets the corresponding properties of the {@link SwaggerServer#settings} property.
 *
 * @constructor
 * @name SwaggerServer
 */
function SwaggerServer(swaggerFile, settings) {
  if (_.isEmpty(swaggerFile)) {
    throw new Error('The "swaggerFile" parameter is required');
  }

  var swaggerServer = this;
  if (!swaggerServer) {
    throw new Error('The "new" operator is required when creating a SwaggerServer instance');
  }


  /**
   * Settings that determine how the Swagger-Server behaves and which
   * features are enabled.
   */
  this.settings = {
    /**
     * By default, Swagger-Server will automatically handle all CORS preflight requests,
     * and will add the appropriate CORS headers to every HTTP response.
     * You can fully customize this behavior using your Swagger spec. See "CORS.js" for more details.
     * Or you can completely disable Swagger-Server's CORS functionality by setting this property to false.
     * @type {boolean}
     */
    enableCORS: true,

    /**
     * Swagger-Server automatically provides mock implementations for
     * each operation defined in your Swagger spec.  This is useful for
     * development and testing purposes, but when you're ready to provide
     * the real implementation for your API, you can disable the mocks.
     *
     * NOTE: Swagger-Server's mock implementations are always executed last,
     * so you can add your own implementation middleware (real or mock) and
     * then call Swagger-Server's mock via `next()`, or you can bypass
     * Swagger-Server's mock by not calling `next()` and sending your own
     * response instead.
     * @type {boolean}
     */
    enableMocks: true
  };


  /**
   * Metadata about the current state of Swagger-Server.
   */
  this.metadata = {
    /**
     * The file path that the SwaggerObject was loaded from.
     * @type {string}
     */
    swaggerFile: swaggerFile,

    /**
     * The SwaggerObject (https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#swagger-object-).
     * This property is null until the `specLoaded` event has fired.
     * @type {Object|null}
     */
    swaggerObject: null,

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
    startedDate: null,

    /**
     * The date/time at which the current Swagger spec was loaded.
     * This property is null until the `specLoaded` event has fired.
     * @type {Date|null}
     */
    specLoadedDate: null,

    /**
     * If the most recent `specChange` event resulted in an error,
     * then this property contains that error. Otherwise, this property is null.
     * @type {Error|null}
     */
    error: null
  };


  /**
   * Adds the given function(s) to the middleware stack for the
   * given Swagger path and operation.  Or you can specify an operationId
   * rather than a path and operation (must match an operationId defined
   * in the Swagger spec).
   *
   * If path+operation, or operatorId are not specified, then the middleware
   * function(s) will be used as generic Express middleware.  It will run
   * _before_ any Swagger-Server middleware, and will _not_ have access to
   * Swagger-Server metadata (`req.swagger` and `res.swagger`).  This is
   * useful for adding general-purpose middleware, such as logging, error-handling,
   * and view engines.
   *
   * @param {string} [path]
   * a path that is defined in the Swagger spec (must exactly match,
   * without any host, basePath, etc.)
   *
   * @param {string} [operation]
   * the Swagger operation that the middleware will handle
   *
   * @param {...function|function[]} middleware
   * a middleware function, an array of middleware functions,
   * or pass each middleware as separate params
   *
   * @returns {SwaggerServer}
   */
  this.use = function use(path, operation, middleware) {
    if (_.isFunction(path) || _.isArray(path)) {
      // No path or operation were specified, so this is general-purpose middleware (not Swagger-Server middleware).
      var fns = _.flatten(_.rest(arguments, 0));
      _.each(fns, function(fn) {
        if (fn.length === 4) {
          // This is an error handler
          errors.use(fn);
        }
        else {
          // This is normal middleware
          app.use(fn);
        }
      });
    }
    else {
      // A path and/or operation were specified, so this is Swagger-Server middleware.
      // So add it to the Router.
      router.use.apply(router, _.rest(arguments, 0));
    }

    return swaggerServer;
  };


  /**
   * Shortcut methods for calling {@link SwaggerServer#use} for
   * all verbs.  If path is not specified, the middleware will
   * be used for all paths.
   *
   * @param {string} [path]
   * a path that is defined in the Swagger spec (must exactly match,
   * without any host, basePath, etc.)
   *
   * @param {...function|function[]} middleware
   * a middleware function, an array of middleware functions,
   * or pass each middleware as separate params
   *
   * @returns {SwaggerServer}
   */
  this.all = function all(path, middleware) {
    if (typeof(path) === 'string')
      return swaggerServer.use(path, '*', _.rest(arguments));
    else
      return swaggerServer.use('*', '*', _.rest(arguments, 0));
  };


  swaggerMethods.forEach(function makeVerbMethod(operation) {
    /**
     * Shortcut method for calling {@link SwaggerServer#use} for
     * a specific verb.  If path is not specified, the middleware
     * will be used for all paths.
     *
     * @param {string} [path]
     * a path that is defined in the Swagger spec (must exactly match,
     * without any host, basePath, etc.)
     *
     * @param {...function|function[]} middleware
     * a middleware function, an array of middleware functions,
     * or pass each middleware as separate params
     *
     * @returns {SwaggerServer}
     */
    swaggerServer[operation] = function verb(path, middleware) {
      if (typeof(path) === 'string')
        return swaggerServer.use(path, operation, _.rest(arguments));
      else
        return swaggerServer.use('*', operation, _.rest(arguments, 0));
    };
  });


  /**
   * Creates an HTTP or HTTPS server, depending on the "schemes" setting in the Swagger spec
   * and begins listening for requests.  If both HTTP and HTTPS schemes are defined in the spec,
   * then Swagger-Server will choose HTTPS if you you can pass the `options` parameter, or
   * HTTP if you don't pass the `options` parameter.
   *
   * If the `host` property in the Swagger spec includes a port number, then that port number
   * is used. Otherwise, the `port` parameter is used.
   *
   * @param {integer} [port]
   * the port number to use (if one is not specified in the Swagger spec).
   *
   * @param {object}  [options]
   * if the Swagger spec defines the HTTPS scheme, then this parameter is passed directly to
   * the {@link https#createServer} method.  This allows you to specify your SSL key and certificate.
   *
   * @param {function} [callback]
   * an optional callback function that will be invoked once the server is started.  It will be passed the
   * {@link http.server} or {@link https.server} object;
   *
   * @returns {SwaggerServer}
   */
  this.start = function start(port, options, callback) {
    // shift args if needed
    if (_.isObject(port)) {
      options = port;
      port = undefined;
    }
    if (_.isFunction(port)) {
      callback = port;
      port = undefined;
      options = undefined;
    }
    else if (_.isFunction(options)) {
      callback = options;
      options = undefined;
    }

    // Parse the Swagger spec, so we can get the info we need to start the server.
    startWatchingSwaggerFile(function(err, swagger) {
      if (err) {
        return doCallback(new Error(format('Swagger-Server cannot start due to the following error(s): \n%s', err)));
      }

      if (started) {
        return doCallback(new Error('Swagger-Server has already started. It cannot be started again.'));
      }

      if (stopped) {
        return doCallback(new Error('The server has been stopped and cannot handle any further requests'));
      }

      // Get the port number from the Swagger spec
      var host = swagger.host || '';
      var hostMatches = host.match(/[^:]+(?:\:(\d+))?$/); // ['hostname', 'port']
      if (hostMatches && hostMatches.length === 2) {
        port = parseInt(hostMatches[1]) || port;
      }

      // Determine which scheme to use
      var scheme = 'http';
      if (swagger.schemes && swagger.schemes.indexOf('https') >= 0 && options) {
        scheme = 'https';
      }

      debug('Starting %s server', scheme);
      if (scheme === 'http') {
        httpServer = http.createServer(swaggerServer.middleware);
      }
      else {
        httpServer = https.createServer(options, swaggerServer.middleware);
      }
      httpServer.listen(port);

      // Make sure the server started successfully
      var address = httpServer.address();
      if (address && address.port) {
        debug('%s server started', scheme);
        swaggerServer.metadata.url = url.parse(scheme + '://localhost:' + address.port);
      }
      else {
        throw new Error(format(
          'The %s server failed to start. Make sure port %d is not already in use.', scheme, port));
      }

      // Automatically stop SwaggerServer if the underlying HTTP server is closed
      httpServer.on('close', swaggerServer.stop);

      // Configure the Express server
      configureExpress();

      doCallback(null, httpServer);
    });

    function doCallback(err, server) {
      if (_.isFunction(callback)) {
        callback(err, server);
      }
      else if (err) {
        throw err;
      }
    }

    return swaggerServer;
  };


  /**
   * Alias of {@link SwaggerServer#start}.
   * @type {Function}
   * @returns {SwaggerServer}
   */
  this.listen = this.start;


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
  this.stop = function(callback) {
    if (!stopped) {
      app = null;
      router = null;

      // Remove event listeners
      swaggerServer.removeListener('specChange', parseSwaggerFile);
      fs.unwatchFile(swaggerFile, checkSwaggerFile);

      // Close the HTTP server
      // NOTE: If Swagger-Server is being used as middleware in a larger Express app, then we can't close it.
      if (httpServer) {
        httpServer.removeListener('close', swaggerServer.stop);
        httpServer.close(callback);
        httpServer = null;
      }
      else if (callback) {
        setImmediate(callback);
      }

      stopped = true;
    }

    return swaggerServer;
  };


  /**
   * Alias of {@link SwaggerServer#stop}.
   * @type {Function}
   * @returns {SwaggerServer}
   */
  this.close = this.stop;


  /**
   * A middleware function that can be used in a Node/Express/Connect application.
   * @type {function}
   */
  this.middleware = function middleware(req, res, next) {
    var args = arguments;

    if (stopped) {
      return next(new Error('The server has been stopped and cannot handle any further requests'));
    }

    // Parse the Swagger file, if not already parsed
    startWatchingSwaggerFile(function(err) {
      if (err) {
        return next(err);
      }

      // Configure Express, if not already configured
      configureExpress();

      // Pass the request along to the Express app
      app.apply(null, args);
    });
  };


  /**
   * Reads the Swagger file immediately, and monitors it for changes.
   */
  function startWatchingSwaggerFile(callback) {
    if (watching) {
      // We're already watching the file, so just invoke the callback
      callback(null, swaggerServer.metadata.swaggerObject);
    }
    else {
      // Immediately fire the "specChange" event to kick-off the initial load of the Swagger file
      swaggerServer.emit('specChange');

      // Invoke the callback when finished parsing the spec
      swaggerServer.once('specLoaded', callback);

      // Check the Swagger file for changes every second
      fs.watchFile(swaggerFile, {persistent: false, interval: 1000}, checkSwaggerFile);

      watching = true;
    }
  }


  /**
   * Determines whether the Swagger spec file has changed by comparing the current and previous Stats.
   * If the file has changed, then the "specChange" event is fired.
   * @param {fs.Stats}  curr
   * @param {fs.Stats}  prev
   */
  function checkSwaggerFile(curr, prev) {
    if (curr.mtime.getTime() > prev.mtime.getTime()) {
      swaggerServer.emit('specChange');
    }
  }


  /**
   * Configures the Express server and fires the "start" event.
   */
  function configureExpress() {
    if (!started) {
      // Add middleware to the Express app
      app.use(response.poweredBy(swaggerServer));
      app.use(CORS.defaults(swaggerServer));
      app.use(router.middleware);
      app.use(errors.catchAll(swaggerServer));

      if (swaggerServer.metadata.url) {
        debug('Swagger-Server is now running at %s', swaggerServer.metadata.url.href);
      }

      swaggerServer.metadata.startedDate = new Date();
      swaggerServer.emit('start');

      started = true;
    }
  }


  /**
   * Reloads the Swagger file and updates the SwaggerServer's state accordingly.
   */
  function parseSwaggerFile() {
    parser.parse(swaggerFile, function(err, swaggerObject) {
      if (err) {
        console.warn('WARNING! An error occurred while parsing the Swagger file: \n%s', err.stack || err.message);
      }

      swaggerServer.metadata.error = err || null;
      swaggerServer.metadata.specLoadedDate = new Date();
      swaggerServer.swaggerObject = swaggerObject;

      swaggerServer.emit('specLoaded', err, swaggerObject);
    });
  }


  // Apply any settings
  settings = settings || {};
  _.merge(swaggerServer.settings, settings);

  var started = false, stopped = false, watching = false;
  var httpServer = null;
  var app = express();
  var router = new SwaggerRouter(swaggerServer);
  _.extend(swaggerServer, EventEmitter.prototype);

  // Reload the Swagger file whenever the spec changes
  swaggerServer.on('specChange', parseSwaggerFile);
}

