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
            self.__removeAllMiddleware();
            self.__addApiMiddleware(api);
        }
    });

    // When the server's in an error state, serve error middleware instead
    self.on('error', function(err) {
        self.__removeAllMiddleware();
        self.__addErrorMiddleware(err);
    });
};


/**
 * Removes all middleware from Express
 * @private
 */
Middleware.prototype.__removeAllMiddleware = function() {
    var middlewareStack = this.__router.stack;
    middlewareStack.splice(0, middlewareStack.length);
};


/**
 * Adds Express middleware for the given Swagger API
 * @param {SwaggerObject} api
 * @private
 */
Middleware.prototype.__addApiMiddleware = function(api) {
    this.__router.use(Middleware.fns.poweredBy.bind(this));

    this.__router.use(function(req, res, next) {
        res.sendStatus(404);
    });
};


/**
 * Adds middleware for when the server is in an error state.
 * @param {Error} err
 * @private
 */
Middleware.prototype.__addErrorMiddleware = function(err) {
    this.__router.use(function error(req, res, next) {
        next(err);
    });
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
