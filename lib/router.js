'use strict';

var express = require('express');
var _ = require('lodash');
var util = require('./helpers/util');
var Middleware = require('./middleware');


module.exports = SwaggerRouter;


/**
 * Routes web requests to their appropriate Swagger middleware.
 * @constructor
 */
function SwaggerRouter(settings) {
    var self = this;

    // Copy (and extend) prototype properties
    self.settings = _.extend({}, SwaggerRouter.prototype.settings, settings);

    /**
     * All Swagger-Server middleware, including built-in, user-defined, and error handlers.
     * @type {Middleware[]}
     * @private
     */
    self.__middleware = [
        /*
         TODO: Add the default Swagger Server middleware
         app.use(response.poweredBy(swaggerServer));
         app.use(CORS.defaults(swaggerServer));
         app.use(router.middleware);
         app.use(errors.catchAll(swaggerServer));
         */
    ];

    /**
     * The Express application
     * @type {e.Express}
     * @private
     */
    self.__expressApp = express();
    self.__expressApp.use(function swaggerRouter(req, res, next) {
        self.__middleware.forEach(function(middleware) {
            // TODO:
        });
        res.sendStatus(404);
    });
}


/**
 * Settings that determine how the Router behaves and which features are enabled.
 */
SwaggerRouter.prototype.settings = {
    /**
     * Swagger-Server automatically provides mock implementations for each operation defined in your Swagger spec.
     * This is useful for development and testing purposes, but when you're ready to provide the real implementation
     * for your API, you can disable the mocks by setting this to false.
     *
     * NOTE: Swagger-Server's mock implementations are always executed last,
     * so you can add your own implementation middleware (real or mock) and then call Swagger-Server's mock via
     * `next()`, or you can bypass Swagger-Server's mock by not calling `next()` and sending your own response instead.
     *
     * @type {boolean}
     */
    enableMocks: true,

    /**
     * By default, Swagger-Server will automatically handle all CORS preflight requests,
     * and will add the appropriate CORS headers to every HTTP response.
     * You can fully customize this behavior using your Swagger spec. See "CORS.js" for more details.
     * Or you can completely disable Swagger-Server's CORS functionality by setting this property to false.
     * @type {boolean}
     */
    enableCORS: true
};


/**
 * Adds middleware function(s) for a given Swagger path and operation.
 * Or you can specify an operationId rather than a path and operation
 * (must match an operationId defined in the Swagger spec).
 *
 * If path+operation, or operatorId are not specified, then the middleware
 * function(s) will be used as normal Express middleware, rather than Swagger-Server middleware.
 * The middleware will run _before_ any Swagger-Server middleware, and will _not_ have access to
 * Swagger-Server metadata (`req.swagger` and `res.swagger`).  This is useful for adding
 * general-purpose middleware, such as logging, error-handling, and view engines.
 *
 * @param   {string}    [path]
 * A path that is defined in the Swagger spec (e.g. "/users", "/products/{productId}/reviews", etc.)
 * The path must exactly match the path in the Swagger spec, case-sensitive.
 *
 * @param   {string}    [operation]
 * The Swagger operation that the middleware will handle (e.g. "get", "post", "delete", etc.)
 *
 * @param {...function|function[]} middleware
 * A middleware function, an array of middleware functions, or pass each middleware as separate params
 *
 * @returns {SwaggerRouter}
 */
SwaggerRouter.prototype.use = function use(path, operation, middleware) {
    if (_.isString(operation)) {
        // The (path, operation, middleware) signature was used
        createMiddleware(this, _.rest(arguments, 2), {
            priority: Middleware.priorities.userDefined,
            path: path,
            operation: operation
        });
    }
    else if (_.isString(path)) {
        // The (operationId, middleware) signature was used
        createMiddleware(this, _.rest(arguments, 1), {
            priority: Middleware.priorities.userDefined,
            operationId: path
        });
    }
    else {
        // The (middleware) signature was used, so treat this middleware as generic Express middleware.
        // It will run for all paths and operations, but BEFORE any other middleware
        createMiddleware(this, _.rest(arguments, 0), {
            priority: Middleware.priorities.generic
        });
    }

    return this;
};


/**
 * Adds middleware function(s) for all operations for a given path.
 * If no path is specified, then the middleware function(s) will be used for
 * all paths and operations in the Swagger spec.
 *
 * @param   {string}    [path]
 * A path that is defined in the Swagger spec (e.g. "/users", "/products/{productId}/reviews", etc.)
 * The path must exactly match the path in the Swagger spec, case-sensitive.
 *
 * @param {...function|function[]} middleware
 * A middleware function, an array of middleware functions, or pass each middleware as separate params
 *
 * @returns {SwaggerRouter}
 */
SwaggerRouter.prototype.all = function all(path, middleware) {
    if (typeof(path) === 'string') {
        // The (path, middleware) signature was used
        createMiddleware(this, _.rest(arguments), {
            priority: Middleware.priorities.userDefined,
            path: path
        });
    }
    else {
        // The (middleware) signature was used, so this middleware applies to all paths and operations
        createMiddleware(this, _.rest(arguments, 0), {
            priority: Middleware.priorities.userDefined
        });
    }

    return this;
};


util.swaggerMethods.forEach(function makeVerbMethod(method) {
    /**
     * Adds middleware function(s) for the corresponding Swagger operation for the given path.
     * If no path is specified, then the middleware function(s) will be used for
     * all paths in the Swagger spec.
     *
     * @param   {string}    [path]
     * A path that is defined in the Swagger spec (e.g. "/users", "/products/{productId}/reviews", etc.)
     * The path must exactly match the path in the Swagger spec, case-sensitive.
     *
     * @param {...function|function[]} middleware
     * A middleware function, an array of middleware functions, or pass each middleware as separate params
     *
     * @returns {SwaggerRouter}
     */
    SwaggerRouter.prototype[method] = function verb(path, middleware) {
        if (typeof(path) === 'string') {
            // The (path, middleware) signature was used
            createMiddleware(this, _.rest(arguments), {
                priority: Middleware.priorities.userDefined,
                path: path,
                operation: method
            });
        }
        else {
            // The (middleware) signature was used, so this middleware applies to all paths
            createMiddleware(this, _.rest(arguments, 0), {
                priority: Middleware.priorities.userDefined,
                operation: method
            });
        }

        return this;
    };
});


/**
 * Stops the router and frees memory.
 * Once the router has been stopped, it cannot be restarted.
 *
 * @returns {SwaggerRouter}
 */
SwaggerRouter.prototype.stop = function stop() {
    this.__expressApp = null;
    this.__middleware = [];
};


/**
 * A middleware function that can be used in an Express/Connect application.
 * @type {function}
 */
SwaggerRouter.prototype.middleware = function middleware(req, res, next) {
    this.__expressApp.apply(null, arguments);
};


/**
 * Creates one or more {@link Middleware} objects, and adds them to the router.
 * @param   {SwaggerRouter}         router
 * @param   {function|function[]}   fns         The middleware function(s)
 * @param   {Middleware}            props       A property map for the Middleware objects
 */
function createMiddleware(router, fns, props) {
    fns = _.flatten(fns);
    fns.forEach(function(fn) {
        props.fn = fn;
        var middleware = new Middleware(props);
        router.__middleware.push(middleware);
    });
}
