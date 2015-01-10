'use strict';

module.exports = HeaderMiddleware;

/**
 * Middleware that sets HTTP response headers
 * @param {SwaggerServer} server
 */
function HeaderMiddleware(server) {
    /**
     * Sets the "X-Powered-By" header
     */
    this.poweredBy = function(req, res, next) {
        if (server.enabled('x-powered-by')) {
            res.setHeader('X-Powered-By', 'Swagger Server');
        }
        next();
    };
}
