'use strict';

module.exports = ErrorMiddleware;

/**
 * Error-handling middleware.
 * @param {SwaggerServer} server
 */
function ErrorMiddleware(server) {
    var currentError = null;

    server.on('error', function(err) {
        currentError = err;
    });

    server.on('parsed', function(api) {
        if (api) {
            currentError = null;
        }
    });


    /**
     * Sends the current error (if any) downstream to the next middleware.
     */
    this.sendError = function(req, res, next) {
        next(currentError);
    };
}
