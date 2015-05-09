'use strict';

// Set the DEBUG environment variable to enable debug output
process.env.DEBUG = 'swagger:*';

// Create a Swagger Server from the PetStore.yaml file
var swagger = require('swagger-server');
var server = new swagger.Server('PetStore.yaml');

// Start the server (port 8000 is specified in PetStore.yaml)
server.start(function() {
  console.log('The Swagger Pet Store is now running at http://localhost:8000');
});
