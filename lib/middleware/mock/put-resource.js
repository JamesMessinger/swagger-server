(function() {
  'use strict';

  var debug = require('./debug');
  var _ = require('lodash');
  var dataStore = require('./data-store');

  /**
   * PUT /path/to/a/{resource}
   *
   * This mock completely replaces the REST resource at the specified URL.
   */
  module.exports = function putResourceMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // If there's no request body, then there's nothing to do
    var newResource = req.body;
    if (_.isEmpty(newResource)) {
      return next();
    }

    // Store the new resource
    newResource = dataStore.overwriteResource(req.path, newResource);

    // Set the response body (unless it's already been set by custom middleware)
    if (!res.body) res.body = newResource;

    next();
  };

})();
