'use strict';

module.exports = createServer;

var SwaggerServer = require('./server');


/**
 * Creates an Express application with SwaggerServer functionality.
 *
 * @param {string} swaggerPath
 * The path of a Swagger file (JSON or YAML)
 *
 * @returns {SwaggerServer}
 */
function createServer(swaggerPath) {
    var server = new SwaggerServer();
    server.__parse(swaggerPath);
    return server;
}
