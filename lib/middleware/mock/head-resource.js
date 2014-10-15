(function() {
  'use strict';

  var debug = require('../../helpers/debug').mocks;
  var dataStore = require('./data-store');
  var error = require('../../errors').createError;

  /**
   * HEAD /path/to/a/{resource}
   *
   * This mock simply ensures that there is an existing resource at the specified URL,
   * and returns a 404 error if there is no resource.  Otherwise, it does nothing,
   * and allows other mocks to set response headers, status codes, etc.
   */
  module.exports = function headResourceMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // Get the existing resource for this URL
    var resource = dataStore.fetchResource(req.path);

    // Return a 404 error if not found
    if (resource === undefined) {
      throw error(404, 'Not Found');
    }

    next();
  };
})();
