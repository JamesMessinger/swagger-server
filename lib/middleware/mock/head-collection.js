(function() {
  'use strict';

  var debug = require('./debug');
  var _ = require('../../helpers/lodash-deep');
  var dataStore = require('./data-store');
  var error = require('../../errors').createError;


  /**
   * HEAD /path/to/a/resource   (notice that the last path segment is NOT a parameter)
   * HEAD /path/to/a/collection
   * HEAD /path/to/a/collection?prop=value&prop2=value2...
   *
   * This mock behaves in one of two modes, depending on the 200 response schema definition
   * in the Swagger spec.  If the response schema is an array (or not defined), then this
   * mock operates in "collection" mode, in which a 404 error is never returned - even if
   * there are no resources in the collection.
   *
   * If the response schema is NOT an array, then this mock operates like the "head-resource"
   * mock and verifies that a resource exists for the URL.  In this case, a 404 error is
   * returned if there are no matching resources.
   *
   * This mock supports simple filtering of results via any "query" params that are defined
   * for the operation or path.  Deep property names are allowed (e.g. "?address.city=New+York").
   * Querystring params that are not defined in the Swagger spec are ignored for filtering.
   */
  module.exports = function headCollectionMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // Determine whether the response schema is an object or an array
    var responseType = _.resultDeep(req.swagger.operation, 'responses.200.schema.type')
      || _.resultDeep(req.swagger.operation, 'responses.default.schema.type');

    if (!(responseType === undefined || responseType === 'array')) {
      // Retrieve all resources in this collection
      var collection = dataStore.fetchCollection(req.path, req.swagger.filter);

      // Treat this like a "resource" URL, which returns a 404 if there's not an existing resource
      if (collection.length === 0) {
        throw error(404, 'Not Found');
      }
    }

    next();
  };

})();
