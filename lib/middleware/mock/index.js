(function() {
  'use strict';

  var _ = require('lodash');
  var swaggerMethods = require('../../helpers/swagger-methods');
  var response = require('./response');

  // We don't have a mock for OPTIONS requests, since that's handled by the CORS middleware
  swaggerMethods = _.without(swaggerMethods, 'options');

  // Load all the Swagger-Server mock middleware
  var mocks = {};
  _.each(swaggerMethods, function(method) {
    mocks[method] = {
      resource: require('./' + method + '-resource'),
      collection: require('./' + method + '-collection')
    };
  });


  /**
   * Middleware that provides a mock implementation for the given Swagger operation.
   */
  module.exports = function(fullPathName, method) {
    // If there is no mock for this operation, then exit now
    if (!mocks[method]) return [];

    var pathType = getPathType(fullPathName);

    /**
     * Adds metadata to the `req` and `res` objects that is needed by mocks
     */
    function mockMetadata(req, res, next) {
      // req.swagger.isCollection
      // req.swagger.isResource
      // These are used by some mocks to alter their behavior based on whether this is a "collection" or "resource" operation
      req.swagger.isCollection = pathType === 'collection';
      req.swagger.isResource = pathType === 'resource';


      // req.swagger.filter
      // This is used by some collection mocks to allow filtering of the resources in the collection.
      req.swagger.filter = {};
      var params = (req.swagger.operation.parameters || []).concat(req.swagger.path.parameters || []);

      _.each(_.where(params, { in: 'query' }), function(param) {
        var paramValue = req.swagger.params[param.name];
        if (paramValue !== undefined) {
          req.swagger.filter[param.name] = paramValue;
        }
      });

      next();
    }


    return [
      // Adds metadata that's needed by some mocks
      mockMetadata,

      // The mock middleware for the HTTP method and path type
      mocks[method][pathType],

      // Attempts to make the response body match the response schema
      response.matchSchema,

      // Set the HTTP response code
      response.setStatus,

      // Sets HTTP response headers
      // NOTE: must come after `setStatus`, because it needs `res.statusCode` to be set
      response.setHeaders,

      // Serializes the response, per content-negotiation
      response.serialize
    ];
  };


  /**
   * Swagger-Server categorizes all paths as either "resource paths" or "collection paths".
   * Resource paths operate on a single REST resource, whereas collection paths operate on
   * a collection of resources.
   *
   * For example, the following paths are all considered to be resource paths, because their
   * final path segment contains a parameter:
   *
   *    * /users/{username}
   *    * /products/{productId}/reviews/review-{reviewId}
   *    * /{country}/{state}/{city}
   *
   * Conversely, the following paths are all considered to be collection paths, because their
   * final path segment is NOT a parameter:
   *
   *    * /users
   *    * /products/{productId}/reviews
   *    * /{country}/{state}/{city}/neighborhoods/streets
   *
   * @param {string} pathName
   */
  function getPathType(pathName) {
    var lastSlash = pathName.lastIndexOf('/');
    var lastParam = pathName.lastIndexOf('{');

    if (lastParam > lastSlash) {
      return 'resource';
    }
    else {
      return 'collection';
    }
  }

})();
