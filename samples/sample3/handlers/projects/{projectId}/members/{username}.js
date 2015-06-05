'use strict';

var swagger = require('swagger-server'),
    session = require('../../../sessions');

module.exports = {
  /**
   * PUT /projects/{projectId}/members/{username}
   */
  put: [
    session.identifyUser,
    session.adminsOnly,
    validateUsername,
    updateProjectAssignment
  ],

  /**
   * DELETE /projects/{projectId}/members/{username}
   */
  delete: [
    session.identifyUser,
    session.adminsOnly,
    validateUsername,
    updateProjectAssignment
  ]
};

/**
 * Verifies that the {username} path parameter is valid
 */
function validateUsername(req, res, next) {
  var username = req.params.username;
  var dataStore = req.app.dataStore;

  // Check for an existing employee REST resource - /employees/{username}
  var resource = new swagger.Resource('/employees', username, null);
  dataStore.get(resource, function(err, resource) {
    if (resource) {
      // The username is valid
      next();
    }
    else {
      // The username does not exist, so respond with an HTTP 404 (Not Found)
      res.sendStatus(404);
    }
  });
}

/**
 * Assigns/removes the employee to/from the project, depending on the HTTP method
 */
function updateProjectAssignment(req, res, next) {
  var projectId = req.params.projectId;
  var username = req.params.username;
  var dataStore = req.app.dataStore;

  // Get the project REST resource - /projects/{projectId}
  var resource = new swagger.Resource('/projects', projectId, null);
  dataStore.get(resource, function(err, resource) {
    if (resource) {
      var members = resource.data.assigned;
      var currentlyAssigned = members.indexOf(username) >= 0;

      // Add/remove the employee
      if (req.method === 'PUT' && !currentlyAssigned) {
        members.push(username);
      }
      else if (req.method === 'DELETE' && currentlyAssigned) {
        members.splice(members.indexOf(username), 1);
      }

      // Save changes
      dataStore.save(resource, next);
    }
    else {
      // The project ID does not exist, so respond with an HTTP 404 (Not Found)
      res.sendStatus(404);
    }
  });
}
