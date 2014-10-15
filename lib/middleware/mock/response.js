(function() {
  'use strict';

  var debug = require('../../helpers/debug').mocks;
  var typeIs = require('type-is');
  var _ = require('lodash');
  var XmlBuilder = require('xml2js').Builder;
  var dataStore = require('./data-store');
  var error = require('../../errors').createError;
  var validateSchema = require('../../validation/validate-schema');
  var util = require('../../helpers/util');

  module.exports = {
    /**
     * Sets the "X-Powered-By" header to indicate whether
     * Swagger-Server is running in mock mode.
     * @param {SwaggerServer} swaggerServer
     * @returns {Function}
     */
    poweredBy: function(swaggerServer) {
      return function(req, res, next) {
        if (res.get('X-Powered-By') === 'Express') {
          if (swaggerServer.settings.enableMocks)
            res.set('X-Powered-By', 'Swagger-Server Mock');
          else
            res.set('X-Powered-By', 'Swagger-Server');
        }
        next();
      };
    },


    /**
     * Attempts to make `req.body` match the response schema defined in the Swagger spec
     */
    matchSchema: function matchResponseSchema(req, res, next) {
      var schemaMismatch = false;
      var hasResponseSchema = false;

      // See if the Swagger spec defines a response schema
      _.each(res.swagger.successResponses, function(response, code) {
        if (response.schema) {
          hasResponseSchema = true;

          // There's a response schema, so try to make the response body match the schema
          var adjustedBody = res.body;

          if (_.isArray(adjustedBody)) {
            if (response.schema.type !== 'array') {
              if (adjustedBody.length > 0) {
                // Response body is an array, but schema isn't.
                // So try returning just the first item in the array.
                adjustedBody = adjustedBody[0];
              }
              else {
                // Schema expects a scalar value, but the response body is an empty array.
                // So try returning null instead of the empty array.
                adjustedBody = null;
              }
            }
          }
          else {
            if (response.schema.type === 'array') {
              // Schema expects an array, but the response body is a scalar value.
              // So wrap the response body in an array.
              adjustedBody = [adjustedBody];
            }
          }

          // See if our adjusted response body is valid
          if (validateSchema.isValid(adjustedBody, response.schema)) {
            // SUCCESS !!!
            // The adjusted response body matches the response schema, so use it!
            res.body = adjustedBody;
            schemaMismatch = false;
            return false; // exit the .each loop
          }
          else if (response.schema && response.schema.default !== undefined) {
            // There's a default value specified in the Swagger spec, so use that instead
            res.body = response.schema.default;
          }
          else {
            schemaMismatch = true;
          }
        }
      });

      if (schemaMismatch) {
        console.warn('WARNING! The response body does not match any of the response schemas defined in the Swagger spec');
      }

      if (!hasResponseSchema) {
        // This operation does not define any response schemas, so clear the response
        res.body = undefined;
      }

      next();
    },


    /**
     * Sets `res.status` to the best response code
     * that is allowed by the Swagger spec.  If no acceptable response
     * code is found, then `res.status` is NOT set.  Other middleware
     * can set the code, or Express will use a reasonable default.
     */
    setStatus: function setResponseStatus(req, res, next) {
      // For most operations, we'll default to a 200 response,
      // but for some operations, we'll try another response code first.
      var desiredResponse;
      switch (req.method.toLowerCase()) {
        case 'post':
        case 'put':
          desiredResponse = '201';
          break;
        case 'delete':
          desiredResponse = '204';
          break;
        default:
          desiredResponse = '200';
          break;
      }

      // If the desired response code is defined, then use it.
      // If the "default" response code is defined, then any code is allowed
      if (_.has(res.swagger.successResponses, desiredResponse)
        || _.has(res.swagger.successResponses, 'default')) {
        debug('Using HTTP response code %d, which is permitted by the Swagger spec', desiredResponse);
        res.status(desiredResponse);
      }
      else {
        // The desired code isn't supported, so use the first success code we find
        var http2XXResponses = _.keys(_.omit(res.swagger.successResponses, 'default')).sort();
        if (http2XXResponses.length > 0) {
          debug('Tried to use HTTP response code %s, but it\'s not defined in the Swagger spec. Using HTTP %s instead.',
            desiredResponse, http2XXResponses[0]);
          res.status(http2XXResponses[0]);
        }
        else {
          console.warn(
            'WARNING! There are no HTTP success response codes (e.g. 200, 201, 204) defined for the "%s" %s operation',
            req.path, req.method);
        }
      }

      next();
    },


    /**
     * Adds HTTP response headers, ONLY if they are defined in the Swagger spec AND not already set.
     * NOTE: This middleware must come after `setStatus`, because it relies on `res.statusCode`
     */
    setHeaders: function setResponseHeaders(req, res, next) {
      // If the given header isn't already set, then sets it to the given value,
      // or the default value specified in the Swagger spec
      function setHeaderOrDefault(name, header, value) {
        var alreadySet = res.get(name) !== undefined;

        if (!alreadySet && value) {
          if (header.default === undefined) {
            res.set(name, value);
          }
          else {
            res.set(name, header.default);
          }

          headersSet++;
          debug('    ' + name + ': ✔');
        }
        else {
          debug('    ' + name + ': ✘');
        }
      }

      // Get the response object from the Swagger spec
      var response = res.swagger.successResponses[res.statusCode];

      // If there are no response headers, then there's nothing for us to do
      if (response && response.headers) {

        // Get the metadata for this operation's resource/collection.  Used for setting some headers.
        var resourceMetadata = req.swagger.isCollection
          ? dataStore.fetchCollectionMetadata(req.path) : dataStore.fetchResourceMetadata(req.path);

        // Add any response headers that are defined in the Swagger spec
        debug('Adding HTTP response headers...');
        var headersSet = 0;

        _.each(response.headers, function(header, headerName) {
          switch (headerName) {
            case 'Last-Modified':
              // Set the Last-Modified to the date/time that the resource was last modified.
              setHeaderOrDefault(headerName, header, util.rfc7231(resourceMetadata ? resourceMetadata.modifiedOn : new Date()));
              break;

            case 'Set-Cookie':
              // Generate a random Swagger-Server cookie, or re-use it if it already exists
              var swaggerCookie = req.cookies['swagger-server-mock'];
              if (swaggerCookie === undefined) {
                swaggerCookie = _.uniqueId('random') + _.random(99999999999.9999);
              }

              setHeaderOrDefault(headerName, header, 'swagger-server-mock=' + swaggerCookie);
              break;

            default:
              // For all other cookies, it's up to the developer to specify a default in the Swagger spec
              setHeaderOrDefault(headerName, header, header.default);
          }

        });

        debug('%d headers were set', headersSet);
      }

      next();
    },


    /**
     * Serializes `res.body` in the appropriate format,
     * sets the Content-Type header and sends the serialized response.
     * This middleware can be used for any request, not just Swagger operations.
     */
    serialize: function serializeResponse(req, res, next) {
      // If there's no body, then just send an empty response
      if (!_.isArray(res.body) && _.isEmpty(res.body)) {
        debug('Response body is empty.');
        res.send();
        return;
      }

      // These are the possible serialization formats that this middleware can output
      var serializationFormats = ['json', '*/xml', 'html', 'text'];
      var serializationFormat;

      // If this is a Swagger operation, then `res.swagger.produces` is an array
      // of MIME types that the operation produces that are ALSO valid
      // according to the "Accept" request header.
      // (see "produces.js")
      if (_.isArray(res.swagger.produces)) {
        // Find the first matching format
        _.each(res.swagger.produces, function(mimeType) {
          serializationFormat = typeIs.is(mimeType, serializationFormats);
          if (serializationFormat) {
            return false; // exit the .each loop
          }
        });
      }
      else {
        // This is NOT a Swagger operation, so we don't have a "produces" list.
        // Instead, use any serialization format that is supported by the "Accept" request header
        serializationFormat = req.accepts(serializationFormats);
      }

      debug('Serializing the response body in %s format, per content-negotiation', serializationFormat);
      switch (serializationFormat) {
        case 'json':
          res.json(res.body);
          break;

        case 'html':
        case 'text':
          res.type(serializationFormat);
          res.send(_(res.body).toString());
          break;

        default:
          // This catches "xml", "text/xml", "application/xml", "application/soap+xml", etc.
          if (serializationFormat.indexOf('xml') >= 0) {
            var xmlBuilder = new XmlBuilder();
            var xml = xmlBuilder.buildObject(_.isObject(res.body) ? res.body : { root: res.body });
            res.type('xml');
            res.send(xml);
            break;
          }
          else {
            // HTTP 406 - Not Acceptable
            throw error(406,
              'Swagger-Server does not support serialization in any of the allowed MIME types (%s)',
                res.swagger.produces || req.get('Accept'));
          }
      }
    }
  };


})();
