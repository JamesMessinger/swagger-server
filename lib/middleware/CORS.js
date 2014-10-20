(function() {
  'use strict';

  var debug = require('../helpers/debug');
  var util = require('../helpers/util');
  var swaggerMethods = require('../helpers/swagger-methods');
  var _ = require('lodash');


  /**
   * Automatically sets CORS headers and handles CORS preflight requests.
   * Swagger-Server uses reasonable defaults for each CORS header, but you
   * can override any of them in your Swagger spec.
   *
   * Here's how each of the CORS headers are set:
   *
   * Access-Control-Allow-Origin
   * will echo back the same value as the Origin request header, unless there is a default value
   * specified in the Swagger spec, in which case that value will be used instead. This allows you
   * to specify custom origins, or the "*" wildcard.
   *
   * Vary
   * in accordance with the HTTP spec, if Access-Control-Allow-Origin is set to anything other than
   * "*", then the Vary header will be set to the same value.
   *
   * Access-Control-Allow-Methods
   * this will automatically be set to the list of operations that are defined for the path in
   * the Swagger spec
   *
   * Access-Control-Allow-Headers
   * will echo back the same value as the Access-Control-Request-Headers request header, unless
   * there is a default value specified in the Swagger spec, in which case that value will be
   * used instead.
   *
   * Access-Control-Allow-Credentials
   * will be set to true, unless there is a default value specified in the Swagger spec, in which
   * case that value will be used instead. Note that in accordance with the HTTP spec, this header
   * MUST be false if Access-Control-Allow-Origin is "*"
   *
   * Access-Control-Max-Age
   * will be set to zero to make debugging/development easier, unless there is a default value
   * specified in the Swagger spec, in which case that value will be used instead.
   *
   */
  module.exports = function CORS(req, res, next) {
    debug('Setting CORS headers');


    // Returns the given response header for the current operation, or from the OPTIONS operation
    function getCORSHeader(headerName) {
      // Try to get the header from the current operation
      var header = res.swagger.getHeader(headerName);

      if (header === undefined && req.swagger.path.options) {
        // The current operation doesn't have the header, so check the OPTIONS operation
        var options = req.swagger.path.options;
        _.each(options.responses, function(response) {
          if (response.headers && response.headers[headerName]) {
            header = response.headers[headerName];
            return true; // exit the .each loop
          }
        });
      }

      return header;
    }


    //
    // Access-Control-Allow-Origin
    // ------------------------------------------
    var allowOrigin = getCORSHeader('Access-Control-Allow-Origin');
    if (allowOrigin && allowOrigin.default !== undefined) {
      res.set('Access-Control-Allow-Origin', allowOrigin.default);

      if (allowOrigin.default === '*') {
        res.removeHeader('Vary');
      }
    }


    //
    // Access-Control-Allow-Methods
    // ------------------------------------------
    var allowMethods = getCORSHeader('Access-Control-Allow-Methods');
    if (allowMethods && allowMethods.default !== undefined) {
      res.set('Access-Control-Allow-Methods', allowMethods.default);
    }


    //
    // Access-Control-Allow-Headers
    // ------------------------------------------
    var allowHeaders = getCORSHeader('Access-Control-Allow-Headers');
    if (allowHeaders && allowHeaders.default !== undefined) {
      res.set('Access-Control-Allow-Headers', allowHeaders.default);
    }


    //
    // Access-Control-Allow-Credentials
    // ------------------------------------------
    var allowCreds = getCORSHeader('Access-Control-Allow-Credentials');
    if (allowCreds && allowCreds.default !== undefined) {
      res.set('Access-Control-Allow-Credentials', allowCreds.default);
    }

    if (res.get('Access-Control-Allow-Origin') === '*') {
      res.set('Access-Control-Allow-Credentials', 'false');
    }


    //
    // Access-Control-Max-Age
    // ------------------------------------------
    var maxAge = getCORSHeader('Access-Control-Max-Age');
    if (maxAge && maxAge.default !== undefined) {
      res.set('Access-Control-Max-Age', maxAge.default);
    }


    //
    // Preflight Request check
    // ------------------------------------------
    if (req.method === 'OPTIONS') {
      debug('Swagger-Server is automatically responding to a CORS preflight request');
      res.send();
    }
    else {
      next();
    }

  };


  /**
   * Sets the CORS headers to their default values.
   * This middleware does not rely on `req.swagger` so it can run before any request
   * validation has occurred.  This way, even if validation fails or an error occurs,
   * the CORS headers will still be sent.  This is important because according to the
   * HTTP spec, browsers will hide HTTP response details (including HTTP error codes)
   * from XHR clients if the CORS headers are not set.  So clients would have no way
   * of knowing why their request failed Swagger validation if these headers weren't set first.
   */
  module.exports.defaults = function defaults(swaggerServer) {
    return function corsDefaults(req, res, next) {
      if (swaggerServer.settings.enableCORS) {
        debug('Setting default CORS headers');

        res.set('Access-Control-Allow-Origin', req.get('Origin') || req.ip || '*');
        res.set('Vary', res.get('Access-Control-Allow-Origin'));
        res.set('Access-Control-Allow-Headers', req.get('Access-Control-Request-Headers') || '');
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Access-Control-Max-Age', '0');

        // Super-safe code to get the list of operations for this path
        // without relying on `req.swagger` and without throwing errors
        var headerSet = false;
        var swagger = swaggerServer.swaggerObject;
        if (swagger) {
          // Find this path in the spec
          var path = util.findSwaggerPath(swagger, req.path);
          if (path) {
            var pathItem = swagger.paths[path];
            res.set('Access-Control-Allow-Methods', util.getAllowedMethods(pathItem).join(', '));
            headerSet = true;
          }
        }

        // If we couldn't find the path in the Swagger spec, then default to the Access-Control-Request-Method,
        // or, if that's not available, then just allow everything.
        if (!headerSet) {
          res.set('Access-Control-Allow-Methods', req.get('Access-Control-Request-Method') || swaggerMethods.join(', '));
        }
      }

      next();
    };
  };


})();
