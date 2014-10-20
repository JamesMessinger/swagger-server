(function() {
  'use strict';

  var debug = require('../helpers/debug');
  var _ = require('lodash');
  var typeIs = require('type-is');
  var error = require('./../errors').createError;


  /**
   * Middleware that adds Swagger metadata to the `res` object.
   * `res.swagger` will have the following properties:
   *
   *    * successResponses - The success responses for the operation. This includes 2XX responses and the "default" response.
   *                         (https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#responseObject)
   *
   *    * errorResponses   - The error responses for the operation. This includes 4XX and 5XX responses, and the "default" response.
   *                         (https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#responseObject)
   *
   *    * produces         - An array of content-negotiated MIME types.  These are the MIME types that comply with the
   *                         operation's "produces" MIME types, and also comply with the request's "Accept" header.
   *
   *    * getHeader        - A function that returns the given HTTP response header definition for the operation.
   *                         If the same header is specified on multiple responses, then only the first matching header definition is returned.
   */
  module.exports = {
    /**
     * Adds the `req.swagger.successResponses` and `req.swagger.errorResponses` metadata
     */
    responses: function responsesMetadata(req, res, next) {
      res.swagger = {
        successResponses: _.pick(req.swagger.operation.responses, function(value, key) {
          return key === 'default' || key.charAt(0) === '2';
        }),

        errorResponses: _.pick(req.swagger.operation.responses, function(value, key) {
          return key === 'default' || key.charAt(0) === '4' || key.charAt(0) === '5';
        }),

        /**
         * Returns the header definition from the Swagger spec for the given response header.
         * @param {string} headerName     the name of an HTTP response header (e.g. "Last-Modified")
         * @returns {object|undefined}
         */
        getHeader: function(headerName) {
          var header = null;
          _.each(req.swagger.operation.responses, function(response) {
            if (response.headers && response.headers[headerName]) {
              header = response.headers[headerName];
              return false; // exit the .each loop
            }
          });
          return header || undefined;
        }
    };

      next();
    },


    /**
     * Sets `res.swagger.produces` to an array of MIME types that comply with the Swagger spec and the request's "Accept" header.
     */
    contentNegotiation: function contentNegotiation(req, res, next) {
      debug('Performing content negotiation...');

      var accept = req.get('Accept');
      var produces = req.swagger.operation.produces || req.swagger.swaggerObject.produces || [];

      if (!accept) {
        // There is no "Accept" header, so assume that we can return any type
        res.swagger.produces = produces;
        debug('    No "Accepts" header is present. The operation will produce one of: %s', res.swagger.produces.join(', '));
      }
      else if (produces.length === 0) {
        // NOTE: This is not an error.  Not even a warning.  We already verified that there are no response schemas defined. (see above)
        res.swagger.produces = produces;
        debug('    Unable to perform content negotiation because no "produces" MIME types are defined in the Swagger spec');
      }
      else {
        // Accept is a comma-separated list of MIME types with wildcards
        // (e.g. "text/*", "*/*", etc.)
        accept = accept.split(',');

        // Each MIME type in the Accept header can have additional data,
        // separated by a semicolon.  So remove that data.
        for (var i = 0; i < accept.length; i++) {
          var parts = accept[i].split(';');
          accept[i] = parts[0].trim();
        }

        // Short circuit
        if (accept.indexOf('*/*') >= 0) {
          res.swagger.produces = produces;
          debug('    "Accepts" header allows "*/*". The operation will produce one of: %s', res.swagger.produces.join(', '));
        }
        else {
          // Loop through each MIME type and see if it matches any of the wildcards
          res.swagger.produces = [];
          _.each(produces, function(mimeType) {
            if (typeIs.is(mimeType, accept)) {
              res.swagger.produces.push(mimeType);
            }
          });

          // If none of the MIME types matched any of the wildcards, throw an error
          if (res.swagger.produces.length === 0) {
            // HTTP 406 - Not Acceptable
            throw error(406,
              'This operation does not produce any of the supported content types (%s)', accept.join(', '));
          }

          debug('    Content negotiation completed. The operation will produce one of: %s', res.swagger.produces.join(', '));
        }
      }

      next();
    }
  };

})();
