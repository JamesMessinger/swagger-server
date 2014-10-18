(function() {
  'use strict';

  var debug = require('./helpers/debug').api;
  var _ = require('lodash');
  var express = require('express');
  var util = require('./helpers/util');
  var error = require('./errors').createError;
  var validateRequest = require('./validation/validate-request');
  var bodyParsers = require('./middleware/body-parsers');
  var requestMetadata = require('./middleware/request-metadata');
  var responseMetadata = require('./middleware/response-metadata');
  var CORS = require('./middleware/CORS');
  var mock = require('./middleware/mock');

  /**
   * Routes all paths defined in the Swagger spec to middleware functions.
   *
   * @param {SwaggerServer} swaggerServer
   * @constructor
   */
  function SwaggerRouter(swaggerServer) {
    var swaggerRouter = this;
    var registeredMiddleware = [];

    /**
     * Adds the given function(s) to the middleware stack for the
     * given Swagger path and operation.  Or you can specify an operationId
     * rather than a path and operation (must match an operationId defined
     * in the Swagger spec). If path+operation, or operatorId are not
     * specified, then the middleware function(s) will be used for all
     * paths and operations.
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
     * @returns {SwaggerRouter}
     */
    this.use = function use(path, operation, middleware) {
      if (typeof(operation) === 'string') {
        // The (path, operation, middleware) signature was used
        registeredMiddleware.push({
          path: path,
          operation: operation,
          middleware: _.rest(arguments, 2)
        });
      }
      else if (typeof(path) === 'string') {
        // The (operationId, middleware) signature was used
        registeredMiddleware.push({
          operationId: path,
          middleware: _.rest(arguments, 1)
        });
      }
      else {
        // The (middleware) signature was used
        registeredMiddleware.push({
          path: '*',
          operation: '*',
          middleware: _.rest(arguments, 0)
        });
      }

      return swaggerRouter;
    };


    /**
     * The middleware function that handles the paths in the Swagger spec.
     * @type {function[]}
     */
    this.middleware = express.Router();

    this.middleware.use(function swaggerRouterFn(req, res, next) {
      var swagger = swaggerServer.swaggerObject;
      var basePath = util.normalizePath(swagger.basePath);
      var reqPath = util.normalizePath(req.path);

      // We only care about requests under the SwaggerObject's basePath
      if (reqPath.indexOf(basePath) !== 0) return next();

      // Find the Swagger path that matches this request
      var pathName = util.findSwaggerPath(swagger, reqPath);
      if (pathName) {
        debug('Matched request "%s" to Swagger path "%s"', reqPath, pathName);
        var pathSpec = swagger.paths[pathName];
        var fullPathName = basePath + util.normalizePath(pathName);

        // Find out if the operation is supported
        var operationName = req.method.toLowerCase();
        var operationSpec = pathSpec[operationName];

        if (operationSpec) {
          // This operation is supported.  So make sure the request is valid for the operation.
          validateRequest(req, swagger, pathSpec, operationSpec);

          // Validation passed.  Now run the middleware for the operation
          var middleware = getMiddlewareForOperation(swagger, fullPathName, pathName, pathSpec, operationName, operationSpec);
          runMiddleware(req, res, next, middleware);
        }
        else if (req.method === 'OPTIONS' && swaggerServer.settings.enableCORS) {
          // This is a CORS preflight request, and the CORS setting is enabled,
          // so send a successful response, even though the operation is not defined in the Swagger spec.
          res.sendStatus(200);
        }
        else {
          // This operation is not supported, so return an HTTP 405 (Method Not Allowed)
          http405(req, res, pathSpec);
        }
      }
      else {
        // This path is under the Swagger basePath, but isn't defined in the Swagger spec
        debug('Path "%s" does not appear to be an API request, because it is not defined in the Swagger spec.', req.path);
        next();
      }
    });


    /**
     * Returns the middleware for the given Swagger operation.
     */
    function getMiddlewareForOperation(swagger, fullPathName, pathName, path, method, operation) {
      var middleware = [];
      
      // Adds body parsing middleware
      middleware.push(bodyParsers(swagger, path, operation));

      // Adds Swagger metadata to the request.  Also validates all parameters
      middleware.push(requestMetadata(swagger, fullPathName, path, operation));

      // Adds Swagger metadata to the response.
      middleware.push(responseMetadata.responses);

      // Add CORS headers, or return a response immediately if this is a preflight request
      if (swaggerServer.settings.enableCORS) {
        middleware.push(CORS);
      }

      // Performs content negotiation and adds the results to response metadata
      middleware.push(responseMetadata.contentNegotiation);

      // Add any other registered middleware here
      middleware.push(getRegisteredMiddlewareForOperation(pathName, method, operation.operationId));

      // If mocking is enabled, then mock this operation
      if (swaggerServer.settings.enableMocks) {
        middleware.push(mock(fullPathName, method));
      }

      // If we get to this point, then the request IS specified in the Swagger spec,
      // but no middleware has been added yet that can handle it.
      // So return an HTTP 501 (Not Implemented)
      middleware.push(http501);

      return middleware;
    }


    /**
     * Returns any registered middleware the given operation
     */
    function getRegisteredMiddlewareForOperation(pathName, method, operationId) {
      var middleware = _.flatten(_.map(_.filter(registeredMiddleware,
        function(registered) {
          return (registered.path === pathName && registered.operation === method)
            || (registered.path === '*' && registered.operation === '*')
            || (registered.path === '*' && registered.operation === method)
            || (registered.path === pathName && registered.operation === '*')
            || (registered.operationId !== undefined && registered.operationId === operationId);
        }),
        function(registered) {
          return registered.middleware;
        }));

      debug('There are %d user-registered middleware functions for the "%s" %s operation', middleware.length, pathName, method);
      return middleware;
    }


    /**
     * Throws an HTTP 405 (Method Not Allowed) error, and sets the "Allow" header
     */
    function http405(req, res, pathSpec) {
      // Build a list of the Swagger operations that ARE allowed
      var allowedList = util.getAllowedMethods(pathSpec).join(', ');

      debug('Client attempted a %s operation on "%s", which is not allowed by the Swagger spec. Returning HTTP 405 (Method Not Allowed)',
        req.method, req.path);

      // Let the client know which methods are allowed
      res.set('Allow', allowedList);

      throw error(405, '%s operations are not allowed for "%s". \nOnly the following are allowed: ',
        req.method, req.path, allowedList);
    }


    /**
     * Throws an HTTP 501 (Not Implemented) error
     */
    function http501(req, res, next) {
      throw error(501, 'This operation is defined in the Swagger spec, but not implemented');
    }


    /**
     * Runs the given middleware function(s), using the supplied `req`, `res`, and `next` arguments
     * @param {object} req
     * @param {object} res
     * @param {object} next
     * @param {...function|function[]} middleware
     */
    function runMiddleware(req, res, next, middleware) {
      var fns = _.flatten(_.rest(arguments, 3));
      var fnIndex = 0;

      function runNextMiddleware(err) {
        if (fns.length === 0) {
          // All middleware are done, and the last one called `next()`,
          // So pass control back to Express
          setImmediate(next, err);
          return;
        }

        if (err) {
          // An error occurred in the middleware function, so stop processing other middleware,
          // and start processing error-handling middleware
          debug('     Threw an error: \n%s', err.message);
          setImmediate(next, err);
          return;
        }

        try {
          var fn = fns.shift();
          fnIndex++;
          debug('  %d) %s', fnIndex, fn.name || 'unknown middleware');

          fn.call(undefined, req, res, runNextMiddleware);
        }
        catch (e) {
          runNextMiddleware(e);
        }
      }

      // Start running the middleware
      debug('Running %d middleware functions for the "%s" %s operation...', fns.length, req.path, req.method);
      runNextMiddleware();
    }
  }

  module.exports = SwaggerRouter;

})();
