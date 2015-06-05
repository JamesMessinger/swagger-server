'use strict';

var swagger = require('swagger-server'),
    session = require('./sessions'),
    data    = require('@bigstickcarpet/mock-data');

module.exports = {
  /**
   * Initializes mock employee data
   *
   * @param {SwaggerServer} server
   * @param {function} next
   */
  init: function(server, next) {
    // Create REST resources for each employee
    var resources = data.employees.map(function(employee) {
      return new swagger.Resource('/employees', employee.username, employee);
    });

    // Save the resources to the mock data store
    server.dataStore.save(resources, next);
  },

  /**
   * GET /employees
   */
  get: [
    session.identifyUser,
    session.mustBeLoggedIn
  ],

  /**
   * POST /employees
   */
  post: [
    session.identifyUser,
    session.adminsOnly,
    verifyUsernameDoesNotExist
  ]
};

/**
 * Verifies that the new employee's username isn't the same as any existing username.
 */
function verifyUsernameDoesNotExist(req, res, next) {
  var username = req.body.username;
  var dataStore = req.app.dataStore;

  // Check for an existing employee REST resource - /employees/{username}
  var resource = new swagger.Resource('/employees', username, null);
  dataStore.get(resource, function(err, resource) {
    if (resource) {
      // The username already exists, so send an HTTP 409 (Conflict)
      res.sendStatus(409);
    }
    else {
      next();
    }
  });
}
