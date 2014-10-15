#!/usr/bin/env node

var path = require('path');
var swaggerServer = require('../../../swagger-server');  // you can just use require('swagger-server') in your apps

//
// Load the Swagger file
// ----------------------------------------
var server = swaggerServer(path.join(__dirname, 'petstore.yaml'));


//
// Add custom middleware logic
// ----------------------------------------

// Don't allow duplicate pet names
server.post('/pets', function(req, res, next) {
  var newPetName = req.swagger.params.body.name;
  var existingPets = server.mockDataStore.fetchCollection('/pets');

  // If any of the existing pet names match the new name, then return a 409 (conflict) error
  for (var i = 0; i < existingPets.length; i++) {
    var pet = existingPets[i];

    if (newPetName.toLowerCase() === pet.name.toLowerCase()) {
      var err = new Error('A pet with that name already exists');
      err.status = 409;
      throw err;
    }
  }

  // If we get here, then there are no conflicts with existing names,
  // so proceed to the next middleware.
  next();
});


// This an Express error-handler middleware (notice the extra "err" parameter).
// It will only be called if an error occurs.  See http://expressjs.com/guide/error-handling.html
server.use(function(err, req, res, next) {
  // Return all errors as a custom "errorModel" object
  var errorModel = {
    code: err.status || 500,
    message: err.message || 'Unknown Error'
  };

  res.status(errorModel.code).json(errorModel);
});


//
// Start listening for requests
// ----------------------------------------
server.start();

