'use strict';

process.env.DEBUG = 'swagger:*';

var util    = require('util'),
    swagger = require('swagger-server');

// Create a Swagger Server from the PetStore.yaml file
var server = new swagger.Server('PetStore.yaml');

// Add a custom error handler that returns errors as HTML
server.use(function(err, req, res, next) {
    res.status(err.status);
    res.type('html');
    res.send(util.format('<html><body><h1>%d Error!</h1><pre>%s</pre></body></html>', err.status, err.message));
});

server.start(function() {
    console.log('The Swagger Pet Store is now running at http://localhost:8000');
});
