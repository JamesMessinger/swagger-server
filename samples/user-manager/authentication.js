/**
 * This file contains middleware to handle user authentication,
 * including logging in, logging out, and setting and reading the session cookie.
 */
module.exports = function(server) {

  /**
   * Authenticates the user via the session cookie on the request.
   * If authentication succeeds, then the user's info is stored at `req.user`
   * so it can be used by subsequent middleware.
   */
  server.all(function authenticateUser(req, res, next) {
    // Get the session ID from the session cookie
    var sessionId = req.cookies['demo-session-id'];
    req.user = {};

    if (sessionId) {
      // Find the user account for this session ID
      var results = server.mockDataStore.fetchCollection('/users', { sessionId: sessionId });

      if (results.length === 1) {
        // Found 'em!  Add the user object to the request, so other middleware can use it
        req.user = results[0];
        console.log('User: %s', req.user.username);
      }
    }

    next();
  });


  /**
   * Handles log-in requests.  If login succeeds, then a session cookie is created.
   */
  server.post('/users/login', function login(req, res, next) {
    var username = req.swagger.params.body.username;
    var password = req.swagger.params.body.password;

    var user = server.mockDataStore.fetchResource('/users/' + username);
    if (!user || user.password !== password) {
      // Login failed
      res.status(401).send('Invalid username or password');
    }
    else {
      // Login succeeded, so update the user's lastLoginDate
      user.lastLoginDate = new Date();

      // Set a session cookie that expires waaaaaay in the future
      user.sessionId = 'random_' + Math.random();
      res.set('Set-Cookie', 'demo-session-id=' + user.sessionId + '; Expires=Sat, 31-Dec-2050 00:00:00 GMT; Path=/');

      // Save the user's data
      server.mockDataStore.overwriteResource('/users/' + username, user);

      // Return the user
      res.json(user);
    }
  });


  // NOTE: No need to implement logout functionality, since all that entails is deleting the session cookie.
  // There's already a "Set-Cookie" header defined in the Swagger file for the "POST /users/logout" operation.
  // Swagger-Server will automatically apply that cookie using the default value in the Swagger file.
  // Because the default value includes a cookie expiration date that's in the past, the cookie is automatically deleted.

};
