'use strict';

var swagger = require('swagger-server'),
    session = require('./sessions'),
    data    = require('@bigstickcarpet/mock-data');

module.exports = {
  /**
   * Initializes mock project data
   *
   * @param {SwaggerServer} server
   * @param {function} next
   */
  init: function(server, next) {
    // Create REST resources for each project
    var resources = data.projects.map(function(project) {
      return new swagger.Resource('/projects', project.id, project);
    });

    // Save the resources to the mock data store
    server.dataStore.save(resources, next);
  },

  /**
   * GET /projects
   */
  get: [
    session.identifyUser,
    session.mustBeLoggedIn
  ],

  /**
   * POST /projects
   */
  post: [
    session.identifyUser,
    session.adminsOnly,
    verifyProjectIdDoesNotExist,
    verifyProjectNameDoesNotExist
  ]
};

/**
 * Verifies that the new project's ID isn't the same as any existing ID.
 */
function verifyProjectIdDoesNotExist(req, res, next) {
  var projectId = req.body.id;
  var dataStore = req.app.dataStore;

  // Check for an existing project REST resource - /projects/{projectId}
  var resource = new swagger.Resource('/projects', projectId, null);
  dataStore.get(resource, function(err, resource) {
    if (resource) {
      // The ID already exists, so send an HTTP 409 (Conflict)
      res.sendStatus(409);
    }
    else {
      next();
    }
  });
}

/**
 * Verifies that the new project's name isn't the same as any existing name.
 */
function verifyProjectNameDoesNotExist(req, res, next) {
  var projectName = req.body.name.toLowerCase();
  var dataStore = req.app.dataStore;

  // Get all project REST resources
  dataStore.getCollection('/projects', function(err, resources) {
    var alreadyExists = resources.some(function(resource) {
      return resource.data.name.toLowerCase() === projectName;
    });

    if (alreadyExists) {
      // The ID already exists, so send an HTTP 409 (Conflict)
      res.sendStatus(409);
    }
    else {
      next();
    }
  });
}
