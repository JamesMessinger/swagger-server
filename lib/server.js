(function() {
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
  var dataStore = require('./middleware/mock/data-store');
  var errors = require('./errors');
  var SwaggerRouter = require('./router');


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
      throw new Error('The `swaggerFile` parameter is required');
    }
    settings = settings || {};

    var swaggerServer = this;
    var started = false;
    var app = express();
    var router = new SwaggerRouter(swaggerServer);
    _.extend(this, EventEmitter.prototype);


    /**
     * The SwaggerObject (https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#swagger-object-).
     * This property is initially null until the the Swagger file has been parsed,
     * validated, and dereferenced.  The SwaggerServer object will fire a "specLoaded"
     * event when this process is finished and the SwaggerObject is safe to access.
     * @type {Object|null}
     */
    this.swaggerObject = null;


    /**
     * The file that the SwaggerObject was loaded from.
     * @type {string}
     */
    this.swaggerFile = swaggerFile;


    /**
     * A simple in-memory data-store that's used by the Swagger-Server Mock middleware.
     * It is provided here so you can access it in your own middleware to augment the
     * Swagger-Server Mock behavior.
     * @type {DataStore}
     */
    this.mockDataStore = dataStore._init(swaggerServer);


    /**
     * The events that are emitted by the SwaggerServer object.
     */
    this.events = {
      /**
       * Fires when the Swagger file changes, indicating that it will be reloaded.
       * When the new file is done loading, the `specLoaded` event is fired.
       */
      specChange: 'specChange',

      /**
       * Fires when the Swagger file is first loaded, and again each time the file is reloaded.
       * Until this event is fired, it is not safe to access the {@link SwaggerServer#swaggerObject} property.
       */
      specLoaded: 'specLoaded',

      /**
       * Fires when the Swagger server is first started.
       * This event is only fired once.
       */
      start: 'start'
    };


    /**
     * Metadata about the current state of Swagger-Server.
     * @type {{url: null, startedDate: null, specDate: null, error: null}}
     */
    this.metadata = {
      /**
       * The URL at which Swagger-Server is running.
       * This property is null until the server has started.
       * @type {Url}
       */
      url: null,

      /**
       * The date/time at which Swagger-Server started running.
       * This property is null until the server has started.
       * @type {Date}
       */
      startedDate: null,

      /**
       * The date/time at which the current Swagger spec was loaded.
       * This property is null until the `specLoaded` event has fired.
       * @type {Date}
       */
      specDate: null,

      /**
       * If the most recent `specChange` event resulted in an error,
       * then this property contains that error. Otherwise, this property is null.
       * @type {Error}
       */
      error: null
    };


    /**
     * Settings that determine how the Swagger-Server behaves and which
     * features are enabled.
     *
     * @type {{enableCORS: boolean, enableMocks: boolean}}
     * @name settings
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
    _.merge(this.settings, settings);


    /**
     * A middleware function that can be used in a Node/Express/Connect application.
     * @type {function}
     */
    this.middleware = function middleware(req, res, next) {
      startInternal();

      // Pass the request along to the Express app
      return app.apply(this, arguments);
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


    _.each(swaggerMethods, function makeVerbMethod(operation) {
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


      function doCallback(err, server) {
        if (_.isFunction(callback)) {
          callback(err, server);
        }
        else if (err) {
          throw err;
        }
      }


      function startWhenSpecLoaded(err, swagger) {
        if (err) {
          doCallback(new Error(format('Swagger-Server cannot start due to the following error(s): \n%s', err)));
        }

        if (started) {
          doCallback(new Error('Swagger-Server has already started. It cannot be started again.'));
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
        var server;
        if (scheme === 'http') {
          server = http.createServer(swaggerServer.middleware);
        }
        else {
          server = https.createServer(options, swaggerServer.middleware);
        }
        server.listen(port);

        // Make sure the server started successfully
        var address = server.address();
        if (address && address.port) {
          debug('%s server started', scheme);
          swaggerServer.metadata.url = url.parse(scheme + '://localhost:' + server.address().port);
        }
        else {
          throw new Error(format(
            'The %s server failed to start. Make sure port %d is not already in use.', scheme, port));
        }

        // Fire the "start" event
        startInternal();

        doCallback(null, server);
      }


      if (swaggerServer.swaggerObject) {
        // The Swagger file has already loaded, so start immediately
        startWhenSpecLoaded(null, swaggerServer.swaggerObject);
      }
      else {
        // Wait for the Swagger file to finish loading, then start
        swaggerServer.once(swaggerServer.events.specLoaded, startWhenSpecLoaded);
      }
    };


    /**
     * Alias of {@link SwaggerServer#start}.
     * @type {Function}
     */
    this.listen = this.start;


    /**
     * Performs one-time startup initialization, and fires the "start" event.
     */
    function startInternal() {
      if (!started) {
        started = true;

        // Add middleware to the Express app
        app.use(response.poweredBy(swaggerServer));
        app.use(CORS.defaults(swaggerServer));
        app.use(router.middleware);
        app.use(errors.catchAll(swaggerServer));

        swaggerServer.metadata.startedDate = new Date();
        debug('Swagger-Server is now running at %s', swaggerServer.metadata.url.href);
        swaggerServer.emit(swaggerServer.events.start);
      }
    }


    // Reload the Swagger file whenever the "specChange" event is fired
    swaggerServer.on(swaggerServer.events.specChange, function() {
      parser.parse(swaggerFile, function(err, swaggerObject) {
        if (err) {
          console.warn('WARNING! An error occurred while parsing the Swagger file: \n%s', err.stack || err.message);
        }

        swaggerServer.metadata.error = err || null;
        swaggerServer.metadata.specDate = new Date();
        swaggerServer.swaggerObject = swaggerObject;

        swaggerServer.emit(swaggerServer.events.specLoaded, err, swaggerObject);
      });
    });

    // Immediately fire the "specChange" event to kick-off the initial load of the Swagger file
    swaggerServer.emit(swaggerServer.events.specChange);

    // Watch the Swagger file for changes, and fire the "specChange" event
    fs.watchFile(swaggerServer.swaggerFile, { persistent: false, interval: 3000 }, function(curr, prev) {
      if (curr.mtime.getTime() > prev.mtime.getTime()) {
        swaggerServer.emit(swaggerServer.events.specChange);
      }
    });
  }

  module.exports = SwaggerServer;

})();
