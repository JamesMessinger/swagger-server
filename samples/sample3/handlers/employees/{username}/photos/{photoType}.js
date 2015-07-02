'use strict';

var swagger = require('swagger-server'),
    session = require('../../../sessions'),
    data    = require('@bigstickcarpet/mock-data');

module.exports = {
  init: loadMockData,

  /**
   * GET /employees/{username}/photos/{photoType}
   */
  get: [
    session.identifyUser,
    session.mustBeLoggedIn
  ],

  /**
   * PUT /employees/{username}/photos/{photoType}
   */
  put: [
    session.identifyUser,
    session.yourselfOnly
  ],

  /**
   * DELETE /employees/{username}/photos/{photoType}
   */
  delete: [
    session.identifyUser,
    session.yourselfOnly
  ]
};

/**
 * Loads mock employee photo data
 *
 * @param {SwaggerServer} server
 * @param {function} next
 */
function loadMockData(server, next) {
  // Create REST resources for each employee photo
  var resources = [];
  data.employees.forEach(function(employee) {
    var collectionPath = '/employees/' + employee.username + '/photos';
    resources.push(new swagger.Resource(collectionPath, 'portrait', {path: employee.portrait}));
    resources.push(new swagger.Resource(collectionPath, 'thumbnail', {path: employee.thumbnail}));
  });

  // Save the resources to the mock data store
  server.dataStore.save(resources, next);
}
