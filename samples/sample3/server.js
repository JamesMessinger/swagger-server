'use strict';
/**************************************************************************************************
 * This sample is a complex REST API with authentication, permissions, and business logic.
 * It also demonstrates a modular coding style, by splitting the Swagger definition and JavaScript
 * code into separate files that are easier to understand and maintain.
 **************************************************************************************************/

process.env.DEBUG = 'swagger:*';

var swagger   = require('swagger-server'),
    path      = require('path');

// Parse the Swagger file
var server = new swagger.Server();
server.parse(path.join(__dirname, 'swagger.yaml'));

// Initialize each handler
// TODO: This will be done automatically by Swagger Server
require('./handlers/employees').init(server, function() {
  require('./handlers/projects').init(server, function() {
    require('./handlers/employees/{username}/photos/{photoType}').init(server, function() {
    });
  });
});

// Start listening on port 8000
server.listen(8000, function() {
  console.log('Your REST API is now running at http://localhost:8000');
});
