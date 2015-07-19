'use strict';
/**************************************************************************************************
 * This sample is a complex REST API with authentication, permissions, and business logic.
 * It also demonstrates a modular coding style, by splitting the Swagger definition and JavaScript
 * code into separate files that are easier to understand and maintain.
 **************************************************************************************************/

process.env.DEBUG = 'swagger:*';

var swagger   = require('swagger-server'),
    path      = require('path');
    //sessions  = require('./handlers/sessions'),
    //session   = require('./handlers/sessions/{sessionId}'),
    //employees = require('./handlers/employees'),
    //employee  = require('./handlers/employees/{username}'),
    //photo     = require('./handlers/employees/{username}/photos/{photoType}'),
    //projects  = require('./handlers/projects'),
    //project   = require('./handlers/projects/{projectId}'),
    //member    = require('./handlers/projects/{projectId}/members/{username}');

// Parse the Swagger file
var server = new swagger.Server();

server.parse(path.join(__dirname, 'swagger.yaml'));

// Initialize data
//employees.init(server, function() {
//  photo.init(server, function() {
//    projects.init(server, function() {});
//  });
//});

// Register path handler
//server.get('/sessions', sessions.get);
//server.post('/sessions', sessions.post);
//server.get('/sessions/{sessionId}', session.get);
//server.delete('/sessions/{sessionId}', session.delete);
//server.get('/employees', employees.get);
//server.post('/employees', employees.post);
//server.get('/employees/{username}', employee.get);
//server.patch('/employees/{username}', employee.patch);
//server.delete('/employees/{username}', employee.delete);
//server.get('/employees/{username}/photos/{photoType}', photo.get);
//server.put('/employees/{username}/photos/{photoType}', photo.put);
//server.delete('/employees/{username}/photos/{photoType}', photo.delete);
//server.get('/projects', projects.get);
//server.post('/projects', projects.post);
//server.get('/projects/{projectId}', project.get);
//server.patch('/projects/{projectId}', project.patch);
//server.delete('/projects/{projectId}', project.delete);
//server.put('/projects/{projectId}/members/{username}', member.put);
//server.delete('/projects/{projectId}/members/{username}', member.delete);

// Start listening on port 8000
server.listen(8000, function() {
  console.log('Your REST API is now running at http://localhost:8000');
});
