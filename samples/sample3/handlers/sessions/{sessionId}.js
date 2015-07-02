'use strict';

var session = require('../sessions');

module.exports = {
  // Helper middleware that can be used by other modules
  identifyUser: identifyUser,
  mustBeLoggedIn: mustBeLoggedIn,
  adminsOnly: adminsOnly,
  yourselfOnly: yourselfOnly,

  /**
   * GET /sessions/{sessionId}
   */
  get: [
    session.identifyUser,
    session.yourselfOnly
  ],

  /**
   * DELETE /sessions/{sessionId}
   */
  delete: [
    session.identifyUser,
    session.yourselfOnly
  ]
};

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
