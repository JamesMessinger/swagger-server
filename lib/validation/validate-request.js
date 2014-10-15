(function() {
  'use strict';

  var _ = require('lodash');
  var typeIs = require('type-is');
  var error = require('../errors').createError;
  var syntaxError = require('../errors').createSyntaxError;
  var util = require('../helpers/util');


  // Matches valid response codes
  var responseCodePattern = /(\d\d\d|default)/;


  /**
   * Ensures that the Swagger spec for the given request is properly configured.
   * If validation fails, an error is thrown.
   */
  module.exports = function validateRequest(req, swaggerObject, path, operation) {

    /**
     * Ensures that the request body complies with the "consumes" MIME types for the operation
     */
    function validateConsumes() {
      // NOTE: According to the Swagger 2.0 spec, Operation.consumes overrides SwaggerObject.consumes
      //       https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#operationObject
      var consumes = operation.consumes || swaggerObject.consumes || [];

      var params = util.getParameters(path, operation);

      // Determine if the request requires body content
      var bodyRequired = _.any(params, function(param) {
        return param.required && (param.in === 'body' || param.in === 'formData');
      });

      // Determine if the request has body content
      var contentLength = parseInt(req.get('Content-Length'));
      var isEmpty = contentLength === 0 || !typeIs.hasBody(req); // `typeIs.hasBody` returns false positives if content-length === 0

      if (consumes.length === 0) {
        if (bodyRequired) {
          throw syntaxError(
            'Error in the Swagger file. \nThe "%s" %s operation has a body parameter but does not have any "consumes" MIME types specified',
            req.path, req.method
          );
        }
        else if (!isEmpty) {
          // This operation doesn't consume any MIME types, but the request has body content
          // so HTTP 413 (Request Entity Too Large)
          throw error(413,
            'This operation does not consume content, but the request contains content');
        }
      }
      else {
        if (isEmpty) {
          if (bodyRequired) {
            // HTTP 411 (Length Required)
            throw error(411, 'Request body is empty. \nThis operation requires Content-Type(s): %s',
              consumes.join(', '));
          }
        }
        else if (!req.is(consumes)) {
          // HTTP 415 (Unsupported Media Type)
          throw error(415, 'This operation does not consume Content-Type "%s"', req.get('Content-Type'));
        }
      }
    }


    /**
     * Validates the "produces" MIME types for the operation
     */
    function validateProduces() {
      // NOTE: According to the Swagger 2.0 spec, Operation.produces overrides SwaggerObject.produces
      //       https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#operationObject
      var produces = operation.produces || swaggerObject.produces || [];

      // Determine which MIME types this operation produces
      if (produces.length === 0) {
        // There are no "produces" MIME types, so make sure none of
        // the operation's responses return a body
        _.each(operation.responses, function(response, responseCode) {
          if (response.schema) {
            throw syntaxError(
              'Error in the Swagger file. \nThe "%s" %s operation defines a schema for the %s response, but does not have any "produces" MIME types specified',
              req.path, req.method, responseCode
            );
          }
        });
      }
    }


    /**
     * Validates the "responses" for the operation
     */
    function validateResponses() {
      // NOTE: According to the Swagger 2.0 spec, at least one response definition is required
      //       https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#responsesObject
      var responses = _.filter(operation.responses, function(response, responseCode) {
        return responseCodePattern.test(responseCode);
      });

      if (responses.length === 0) {
        throw syntaxError(
            'Error in the Swagger file. \nThe "%s" %s operation does not have any responses specified. At least one is required '
            + '(you can use "default" if you don\'t know the HTTP response code)',
          req.path, req.method
        );
      }
    }


    validateConsumes();
    validateProduces();
    validateResponses();
  };

})();
