(function() {
  'use strict';

  var debug = require('./debug');
  var dataStore = require('./data-store');
  var error = require('../../errors').createError;

  /**
   * GET /path/to/a/{resource}
   *
   * This mock simply returns whatever resource exists for the specified URL.
   * If there's no resource for the URL, then a 404 error is returned.
   */
  module.exports = function getResourceMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // Get the existing resource for this URL
    var resource = dataStore.fetchResource(req.path);

    // Return a 404 error if not found
    if (resource === undefined) {
      throw error(404, 'Not Found');
    }

    // Set the response body (unless it's already been set by custom middleware)
    if (!res.body) res.body = resource;

    next();
  };
})();
