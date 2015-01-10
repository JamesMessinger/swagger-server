'use strict';

module.exports = Middleware;

var express = require('express');


/**
 * Creates Express middleware for a Swagger API.
 * @constructor
 */
function Middleware() {}


/**
 * Initializes the Middleware
 * @private
 */
Middleware.prototype.__init = function() {
    var self = this;

    /**
     * @type {e.Router}
     * @private
     */
    self.__router = express.Router();
    self.__express.use(self.__router);


    // Add the Express middleware once the Swagger API is parsed
    self.on('parsed', function(api) {
        if (api) {
            self.__resetApiMiddleware(api);
        }
    });

    // When the server's in an error state, serve error middleware instead
    self.on('error', function(err) {
        self.__resetApiMiddleware(err);
    });
};


/**
 * Initializes Swagger-Server middleware for the given Swagger API
 * @param {SwaggerObject|Error} api
 * @private
 */
Middleware.prototype.__resetApiMiddleware = function(api) {
    var router = this.__router;
    clearMiddleware(router);

    router.use(Middleware.fns.poweredBy.bind(this));

    if (api instanceof Error) {
        router.use(function error(req, res, next) {
            next(api);
        });
    }
    else {


        router.use(function(req, res, next) {
            if (req.path === '/200') {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(404);
            }
        });
    }
};


/**
 * Helper middleware functions
 * @private
 */
Middleware.fns = {
    /**
     * Sets the "X-Powered-By" header
     */
    poweredBy: function(req, res, next) {
        if (this.enabled('x-powered-by')) {
            res.setHeader('X-Powered-By', 'Swagger Server');
        }
        next();
    }
};


/**
 * Removes all middleware from the given router
 */
function clearMiddleware(router) {
    var middlewareStack = router.stack;
    middlewareStack.splice(0, middlewareStack.length);
}
