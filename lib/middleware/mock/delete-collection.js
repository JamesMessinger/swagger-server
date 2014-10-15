(function() {
  'use strict';

  var debug = require('../../helpers/debug').mocks;
  var dataStore = require('./data-store');

  /**
   * DELETE /path/to/a/file.ext
   * DELETE /path/to/a/collection
   * DELETE /path/to/a/collection?prop=value&prop2=value2...
   *
   * This mock deletes all matching resources in the collection. Deletions
   * can be filtered via any "query" params that are defined for the
   * operation or path.  Deep property names are allowed (e.g. "?address.city=New+York").
   * Querystring params that are not defined in the Swagger spec are ignored
   * for filtering.
   *
   * If no query params are included, then ALL resources in the collection
   * are deleted.  If the "collection" is actually just a single resource
   * (such as a file name), then this mock behaves like the "delete-resource"
   * mock, deleting the single resource.
   */
  module.exports = function deleteCollectionMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // Delete the resources
    var deletedCollection = dataStore.removeCollection(req.path, req.swagger.filter);

    // Set the response body (unless it's already been set by custom middleware)
    if (!res.body) res.body = deletedCollection;

    next();
  };
})();
