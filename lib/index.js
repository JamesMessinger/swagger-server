'use strict';

var SwaggerServer = require('./server');


/**
 * Creates an Express application, and extends it with SwaggerServer functionality.
 *
 * @param {string} swaggerPath
 * The path of a Swagger file (JSON or YAML)
 *
 * @returns {SwaggerApp}
 */
module.exports = function createServer(swaggerPath) {
    return new SwaggerServer(swaggerPath).app;
};
