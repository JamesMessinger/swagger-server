(function() {
  'use strict';

  var debug = require('../../helpers/debug').mocks;
  var dataStore = require('./data-store');

  /**
   * DELETE /path/to/a/{resource}
   *
   * This mock simply deletes the resource at the specified URL.
   */
  module.exports = function deleteResourceMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // Delete the resource
    var deletedResource = dataStore.removeResource(req.path);

    // Set the response body (unless it's already been set by custom middleware)
    if (!res.body) res.body = deletedResource;

    next();
  };
})();
