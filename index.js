'use strict';

var SwaggerServer = require('./lib/server');


module.exports = createServer;


/**
 * @returns {SwaggerServer}
 */
function createServer(swaggerFile, settings) {
  return new SwaggerServer(swaggerFile, settings);
}
