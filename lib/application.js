'use strict';

var _       = require('lodash'),
    http    = require('http'),
    express = require('express'),
    router  = require('./router'),
    util    = require('./util');

module.exports = {
  /**
   * Patches an Express Application to support Swagger.
   * @param {SwaggerServer} server
   */
  patch: function(server) {
    var app = server.app;
    var set = app.set;

    /**
     * Emit the "set" event whenever a setting is changed
     */
    app.set = function(name, value) {
      // Track the old/new value of the setting
      var oldValue = set.call(app, name);
      var result = set.apply(app, arguments);
      var newValue = set.call(app, name);

      // If it changed, then emit the "set" event
      if (oldValue !== newValue) {
        server.emit('set', name, newValue, oldValue);
      }

      return result;
    };

    /**
     * Bubble app errors up to the Swagger Server.
     */
    app.on('error', function() {
      server.emit.apply(server, ['error'].concat(_.slice(arguments)));
    });

    /**
     * Starts listening for connections, once the Swagger API is done being parsed.
     * If no port number is given, then the port number in the Swagger API will be used.
     * @returns {http.Server}
     */
    app.listen = function(port) {
      var args = _.isUndefined(port) ? _.drop(arguments, 1) : _.drop(arguments, 0);

      var httpServer = http.createServer(app);

      // Wait until parsing is done
      server.__parser.whenParsed(function(err, api, metadata) {
      if (!_.isNumber(port)) {
          // No port number was provided, so get it from the Swagger API
          var host = api ? api.host || '' : '';
          var hostMatches = host.match(/[^:]+(?:\:(\d+))?$/); // ['hostname', 'port']
          if (hostMatches && hostMatches.length === 2) {
            port = parseInt(hostMatches[1]);
          }
        }

        util.debug('Starting HTTP server');
        httpServer.listen.apply(httpServer, _.union([port], args));
      });

      return httpServer;
    };

    /**
     * The {@link DataStore} object that's used by the mock middleware.
     * See https://github.com/BigstickCarpet/swagger-express-middleware/blob/master/docs/exports/DataStore.md
     *
     * @type {DataStore}
     */
    Object.defineProperty(app, 'dataStore', {
      configurable: true,
      enumerable: true,
      get: function() {
        return app.get('mock data store');
      },
      set: function(value) {
        app.set('mock data store', value);
      }
    });

    // Add new app settings
    app.enable('watch files');
    app.enable('mock');

    // Add Swagger middleware
    var swaggerRouter = express.Router();
    app.use(swaggerRouter);
    swaggerRouter.use(
      poweredBy,
      server.__middleware.metadata(),
      server.__middleware.files(),
      server.__middleware.CORS(),
      server.__middleware.parseRequest(),
      server.__middleware.validateRequest()
    );

    // Add Swagger Mock middleware
    var mockRouter = express.Router();
    app.use(mockRouter);
    mockRouter.use(server.__middleware.mock());

    // Patch the routing methods
    router.patch(app, swaggerRouter);

    /**
     * Sets the "X-Powered-By" header
     */
    function poweredBy(req, res, next) {
      if (app.enabled('x-powered-by')) {
        res.setHeader('X-Powered-By', 'Swagger Server');
      }
      next();
    }
  }
};
