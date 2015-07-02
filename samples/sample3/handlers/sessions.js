'use strict';

var swagger = require('swagger-server'),
    _       = require('lodash');

module.exports = {
  /**
   * GET /sessions
   */
  get: [
    identifyUser,
    adminsOnly
  ],

  /**
   * POST /sessions
   */
  post: [
    identifyUser,
    authenticate,
    sendSessionResponse
  ]
};

/**
 * Authenticates the user's login credentials and creates a new user session.
 */
function authenticate(req, res, next) {
  var username = req.body.username,
      password = req.body.password;

  if (req.session && req.session.user.username === username) {
    // This user is already logged in
    next();
    return;
  }

  // Get the employee REST resource - /employees/{username}
  var dataStore = req.app.dataStore;
  var resource = new swagger.Resource('/employees', username, null);
  dataStore.get(resource, function(err, resource) {
    // Check the login credentials
    if (resource && resource.data.password === password) {
      // Login is valid, so create a new session object
      var sessionId = Math.random().toString(36).substr(2);
      req.session = {
        id: sessionId,
        created: new Date(),
        user: resource.data
      };

      // Save the session REST resource
      resource = new swagger.Resource('/sessions', req.session.id, req.session);
      dataStore.save(resource, next);
    }
    else {
      // Login failed
      res.sendStatus(401);
    }
  });
}

/**
 * Sends the session data and session cookie.
 */
function sendSessionResponse(req, res, next) {
  // Set the session cookie
  res.cookie('session', req.session.id);

  // Set the Location HTTP header
  res.location('/sessions/' + req.session.id);

  // Send the response
  res.status(201).json(req.session);
}
