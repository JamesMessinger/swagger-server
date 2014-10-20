(function() {
  'use strict';

  var debug = require('./debug');
  var _ = require('lodash');
  var dataStore = require('./data-store');


  /**
   * PATCH /path/to/a/collection
   * PATCH /path/to/a/file.ext
   *
   * This mock updates a REST resource at the specified URL.
   * Since it doesn't really make sense to update a "collection", this mock
   * always operates in "resource" mode, much like the "patch-resource" mock.
   * If there is already a resource at the URL, then this mock attempts to
   * merge the new resource with the existing one.  If a merge is not possible,
   * then the existing resource is completely overwritten.
   */
  module.exports = function patchCollectionMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // If there's no request body, then there's nothing to do
    var newResource = req.body;
    if (_.isEmpty(newResource)) {
      return next();
    }

    // Store the merged resource
    newResource = dataStore.mergeResource(req.path, newResource);

    // Set the response body (unless it's already been set by custom middleware)
    if (!res.body) res.body = newResource;

    next();
  };

})();
