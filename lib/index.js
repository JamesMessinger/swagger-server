'use strict';

var SwaggerServer = require('./server'),
    swagger = require('swagger-express-middleware');

module.exports = createServer;
module.exports.Server = createServer;
module.exports.DataStore = swagger.DataStore;
module.exports.MemoryDataStore = swagger.MemoryDataStore;
module.exports.FileDataStore = swagger.FileDataStore;
module.exports.Resource= swagger.Resource;


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
