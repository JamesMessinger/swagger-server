'use strict';

// Set the DEBUG environment variable to enable debug output
process.env.DEBUG = 'swagger:*';

// Create a Swagger Server app from the PetStore.yaml file
var swaggerServer = require('swagger-server');
var app = swaggerServer('PetStore.yaml');

// Start listening on port 8000
app.listen(8000, function() {
  console.log('The Swagger Pet Store is now running at http://localhost:8000');
});
