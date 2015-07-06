'use strict';

var swagger = require('swagger-server'),
    _       = require('lodash');

module.exports = {

  // Helper middleware that can be used by other modules
  identifyUser: identifyUser,
  mustBeLoggedIn: mustBeLoggedIn,
  adminsOnly: adminsOnly,
  yourselfOnly: yourselfOnly,

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

/**
 * Identifies the user via the session cookie on the request.
 * `req.session` is set to the user's session, so it can be used by subsequent middleware.
 */
function identifyUser(req, res, next) {
  // Get the session ID from the session cookie
  var sessionId = req.cookies.session;
  req.session = null;

  if (sessionId) {
    // Get the session REST resource
    var resource = new swagger.Resource('/sessions', sessionId, null);
    req.app.dataStore.get(resource, function(err, resource) {
      if (resource) {
        // Add the session to the request, so other middleware can use it
        req.session = resource.data;
        console.log('Current User: %s', req.session.user.username);
      }
      else {
        console.warn('INVALID SESSION ID: ' + sessionId);
      }
      next();
    });
  }
  else {
    console.log('Current User: ANONYMOUS');
    next();
  }
}

/**
 * Prevents access to anonymous users.
 */
function mustBeLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    next();
  }
  else {
    res.status(401).send('You must be logged-in to access this resource');
  }
}

/**
 * Prevents access to anyone who is not in the "admin" role.
 */
function adminsOnly(req, res, next) {
  if (req.session && _.contains(req.session.user.roles, 'admin')) {
    next();
  }
  else {
    res.status(401).send('Only administrators can access this resource');
  }
}

/**
 * Prevents users from accessing another user's account.
 * Except for "admins", who can access any account.
 */
function yourselfOnly(req, res, next) {
  // Get the username or sessionId from the URL
  var username = req.params.username;
  var sessionId = req.params.sessionId;

  if (!req.session) {
    res.status(401).send('You must be logged-in to access this resource');
  }
  else if (_.contains(req.session.user.roles, 'admin') ||
    (username && req.session.user.username === username) ||
    (sessionId && req.session.id === sessionId)) {
    next();
  }
  else {
    res.status(401).send('You can only perform this operation on your own account');
  }
}
