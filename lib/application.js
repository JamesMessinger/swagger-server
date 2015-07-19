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
     *
     * @returns {http.Server}
     */
    app.listen = function() {
      var args = _.slice(arguments);
      var httpServer = http.createServer(app);

      // Wait until parsing is done
      server.__parser.whenParsed(function(err, api, metadata) {
        if (_.isFunction(args[0]) || !args[0]) {
          // No port number was provided, so get it from the Swagger API
          var host = api ? api.host || '' : '';
          var hostMatches = host.match(/(?:\:(\d+))$/); // ['hostname', 'port']
          if (hostMatches && hostMatches.length === 2) {
            var portNumber = parseInt(hostMatches[1]);

            if (args.length === 0) {
              // No args were specified, so just use the port number
              args = [portNumber];
            }
            else if (_.isFunction(args[0])) {
              // A callback was specified, so insert the port number before it
              args.splice(0, 0, portNumber);
            }
            else {
              // A blank port number was specified, so replace it
              args.splice(0, 1, portNumber);
            }
          }
        }

        util.debug('Starting HTTP server');
        httpServer.listen.apply(httpServer, args);
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
    app.set('handlers path', './handlers');

    // Add Swagger middleware
    app.use(
      poweredBy,
      server.__middleware.metadata(),
      server.__middleware.CORS(),
      server.__middleware.files(),
      server.__middleware.parseRequest(),
      server.__middleware.validateRequest()
    );

    //Store the number of swagger middleware stored in the stack not defined by the user so that when the
    //user makes a live change in the ./handlers directory we will only remove the desired results
    var mwToKeepIndex = app._router.stack.length;

    server.__removeMiddleWare = function() {

      var mwToRemove = app._router.stack.length - mwToKeepIndex-mockRange;

      app._router.stack.splice(mwToKeepIndex, mwToRemove);
    };

    // Add Swagger Mock middleware
    app.use(server.__middleware.mock());

    // Patch the routing methods
    router.patch(app._router);
    var mockRange = app._router.stack.length - mwToKeepIndex;

    server.__sortMiddleWare = function() {
      //Get the user MW off of the stack
      var userMW = app._router.stack.splice(mwToKeepIndex+mockRange);
      while( userMW.length !== 0) {
        app._router.stack.splice(mwToKeepIndex, 0, userMW.pop());
      }
    };

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
