(function() {
  'use strict';

  var _ = require('lodash');
  var debug = require('../helpers/debug').validation;
  var util = require('../helpers/util');
  var error = require('./../errors').createError;
  var validateSchema = require('../validation/validate-schema');


  /**
   * Middleware that adds Swagger metadata to the `req` object.
   * `req.swagger` will have the following properties:
   *
   *  * path - the PathItem object (https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#pathItemObject)
   *
   *  * operation - the Operation object (https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#operationObject)
   *
   *  * swaggerObject - the SwaggerObject (https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#swagger-object-)
   *
   *  * params - an object with keys for each of the operation's parameters.
   *
   *    * params[paramName] - a ParameterObject (https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#parameterObject)
   *
   *    * params[paramName].value - the value of the parameter for this request (in the appropriate data type)
   */
  module.exports = function requestMetadata(swaggerObject, fullPathName, path, operation) {
    return function swaggerRequestMetadata(req, res, next) {

      req.swagger = {
        params: {},
        path: path,
        operation: operation,
        swaggerObject: swaggerObject
      };

      debug('Parsing request parameters for %s', req.url);

      var params = util.getParameters(path, operation);
      var pathParams = util.getPathParams(fullPathName, req.path);

      // Loop through each parameter, and add it to the `req.swagger` object
      _.each(params, function(param) {
        debug('    Parsing the %s parameter in %s', param.name, param.in);
        // Get the value of the parameter
        var paramValue;
        switch (param.in) {
          case 'query':
            paramValue = req.query[param.name];
            break;
          case 'header':
            // TODO: If there's a param named "Content-Length", and the header is missing, return an HTTP 411 (Length Required)
            paramValue = req.get(param.name);
            break;
          case 'path':
            paramValue = pathParams[param.name];
            break;
          case 'formData':
            paramValue = req.body;
            break;
          case 'body':
            paramValue = req.body;
            break;
          default:
            throw error(500,
              'Error in the Swagger file. \nParameter "%s" has invalid location "%s"',
              param.name, param.in);
        }

        // Get the schema for this parameter
        var schema;
        if (param.in === 'body') {
          schema = param.schema;
          if (!_.isPlainObject(schema)) {
            throw error(500, 'Error in the Swagger file. \nThere is no schema defined for the "%s" body parameter of the "%s" %s operation',
              param.name, req.path, req.method);
          }
        }
        else {
          // For all other param types, the parameter object itself is the schema
          schema = param;
        }

        // Validate the parameter value
        try {
          req.swagger.params[param.name] = validateSchema.parse(paramValue, schema);
        }
        catch (e) {
          throw error(400, '%s \nThe "%s" %s parameter is invalid (%j).',
            e.message, param.name, param.in, paramValue || param.default);
        }
      });

      next();
    };
  };

})();
