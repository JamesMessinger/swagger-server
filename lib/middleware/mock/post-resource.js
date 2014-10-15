(function() {
  'use strict';

  var debug = require('../../helpers/debug').mocks;
  var _ = require('../../helpers/lodash-deep');
  var dataStore = require('./data-store');

  /**
   * POST /path/to/a/{resource}
   *
   * This mock creates or updates a REST resource with the request body.
   * If there is already a resource at the URL, then this mock
   * attempts to merge the new resource with the existing one.  If a merge
   * is not possible, then the existing resource is completely overwritten.
   */
  module.exports = function postResourceMock(req, res, next) {
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
