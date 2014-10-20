(function() {
  'use strict';

  var debug = require('./debug');
  var _ = require('lodash');
  var dataStore = require('./data-store');


  /**
   * PUT /path/to/a/collection
   * PUT /path/to/a/file.ext
   *
   * This mock completely overwrites the collection at the specified URL.
   * Any existing resources in the collection are deleted.
   */
  module.exports = function putCollectionMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // If there's no request body, then there's nothing to do
    var newResource = req.body;
    if (_.isEmpty(newResource)) {
      return next();
    }

    // Remove the existing collection
    dataStore.removeCollection(req.path);

    // Store the new collection
    newResource = dataStore.overwriteResource(req.path, newResource);

    // Set the response body (unless it's already been set by custom middleware)
    if (!res.body) res.body = newResource;

    next();
  };

})();
