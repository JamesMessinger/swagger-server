(function() {
  'use strict';

  var debug = require('debug');

  module.exports = {
    // Debug messages for the Swagger API server (server.js, router.js)
    api: debug('swagger-server:api'),

    // Debug messages for Swagger-Server Mock middleware
    mocks: debug('swagger-server:mock'),

    // Debug messages for errors in the Swagger spec (mostly in validate-spec.js)
    spec: debug('swagger-server:spec'),

    // Debug messages for validation errors (mostly in validate-schema.js and validate-response.js)
    validation: debug('swagger-server:validation')
  };

})();
