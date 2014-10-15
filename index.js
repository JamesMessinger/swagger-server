
var SwaggerServer = require('./lib/server');


/**
 * @returns {SwaggerServer}
 */
function createServer(swaggerFile, settings) {
  return new SwaggerServer(swaggerFile, settings);
}


module.exports = createServer;
