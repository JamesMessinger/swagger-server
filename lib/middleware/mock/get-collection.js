(function() {
  'use strict';

  var debug = require('./debug');
  var _ = require('../../helpers/lodash-deep');
  var dataStore = require('./data-store');
  var error = require('../../errors').createError;


  /**
   * GET /path/to/a/resource   (notice that the last path segment is NOT a parameter)
   * GET /path/to/a/collection
   * GET /path/to/a/collection?prop=value&prop2=value2...
   *
   * This mock behaves in one of two modes, depending on the 200 response schema definition
   * in the Swagger spec.  If the response schema is an array (or not defined), then this
   * mock operates in "collection" mode and returns an array of all resources in the collection.
   * If no resources are found, then an empty array is returned. No 404 error occurs.
   *
   * If the response schema is NOT an array, then this mock operates like the "get-resource"
   * mock and attempts to only return a single value.  In this case, a 404 error is returned
   * if there are no matching resources.
   *
   * This mock supports simple filtering of results via any "query" params that are defined
   * for the operation or path.  Deep property names are allowed (e.g. "?address.city=New+York").
   * Querystring params that are not defined in the Swagger spec are ignored for filtering.
   */
  module.exports = function getCollectionMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // Retrieve all resources in this collection
    var collection = dataStore.fetchCollection(req.path, req.swagger.filter);

    // Determine whether we should return a single object or the whole array
    var responseType = _.resultDeep(req.swagger.operation, 'responses.200.schema.type')
                    || _.resultDeep(req.swagger.operation, 'responses.default.schema.type');

    if (!(responseType === undefined || responseType === 'array')) {
      // Treat this like a "resource" URL, which returns a 404 if there's not an existing resource
      if (collection.length === 0) {
        throw error(404, 'Not Found');
      }

      // Return the first resource in the collection
      collection = collection[0];
      debug('The response schema for the "%s" %s operation indicates a single object, not an array.  '
        + 'So only the first resource in the collection will be returned.', req.path, req.method);
    }

    // Set the response body (unless it's already been set by custom middleware)
    if (!res.body) res.body = collection;

    next();
  };

})();
