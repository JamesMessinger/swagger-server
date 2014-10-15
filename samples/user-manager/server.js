#!/usr/bin/env node

var path = require('path');
var swaggerServer = require('../../../swagger-server');  // you can just use require('swagger-server') in your apps
var mockUserData = require('./mock-user-data');
var authenticationMiddleware = require('./authentication');
var authorizationMiddleware = require('./authorization');


//
// Load the Swagger file
// ----------------------------------------
var server = swaggerServer(path.join(__dirname, 'users.yaml'));


//
// Create some initial mock data
// ----------------------------------------
for (var i = 0; i < mockUserData.length; i++) {
  var user = mockUserData[i];
  server.mockDataStore.createResource('/users/' + user.username, user);
}


//
// Add custom middleware logic
// ----------------------------------------

// Add middleware from other files
authenticationMiddleware(server);
authorizationMiddleware(server);


// Don't allow creation of duplicate usernames
server.post('/users', function duplicateNameCheck(req, res, next) {
  var newUsername = req.swagger.params.body.username.toLowerCase();
  var existingUsers = server.mockDataStore.fetchCollection('/users');

  for (var i = 0; i < existingUsers.length; i++) {
    var user = existingUsers[i];

    if (user.username.toLowerCase() === newUsername) {
      return res.status(409).send('That username is already taken');
    }
  }

  // If we get here, then there is no username conflict,
  // so it's safe to proceed with saving the new user
  next();
});


// Don't allow people to change their usernames
server.post('/users/{username}', function protectUsername(req, res, next) {
  var existingUsername = req.swagger.params.username;
  var newUser = req.swagger.params.body;

  // Make sure the username stays the same
  newUser.username = existingUsername;

  // Continue saving the user
  next();
});



//
// Start listening for requests
// ----------------------------------------
server.start();

