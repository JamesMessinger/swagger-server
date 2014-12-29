'use strict';

var _ = require('lodash');
var util = require('./helpers/util');


module.exports = Middleware;


/**
 * A single middleware function and its metadata.
 * @param   {function|Middleware}   props   A property map, or the middleware implementation function.
 * @constructor
 */
function Middleware(props) {
    // Override default property values
    _.extend(this, props || {});

    if (!_.isFunction(this.fn)) {
        throw util.createError('"%s" is not a valid middleware function', typeof(this.fn));
    }

    if (!this.type) {
        // Determine the middleware's type based on its arity
        // NOTE: Error handlers MUST have 4 arguments, but normal middleware can have zero, one, two, or three
        this.type = this.fn.length === 4 ? Middleware.types.errorHandler : Middleware.types.normal;
    }
}


/**
 * Enumeration of the different types of middleware.
 * @readonly
 * @enum {number}
 */
Middleware.types = {
    /**
     * Normal, non-error middleware
     */
    normal: 1,

    /**
     * Error-handling middleware
     */
    errorHandler: 2
};


/**
 * Enumeration of middleware priorities.
 * @readonly
 * @enum {number}
 */
Middleware.priorities = {
    /**
     * Generic middleware that does not rely on Swagger-Server's middleware
     * (e.g. logging, view engines, etc.)
     */
    generic: 1,

    /**
     * Swagger-Server's core middleware, which performs validation, annotation, etc.
     */
    swaggerServer: 2,

    /**
     * User-defined middleware that relies on Swagger-Server's middleware
     * (i.e. `req.swagger` and `res.swagger`)
     */
    userDefined: 3,

    /**
     * Swagger-Server's mock middleware
     */
    mocks: 4
};


/**
 * The Swagger path that this middleware handles.
 * Null indicates all paths.
 * @type {string|null}
 */
Middleware.prototype.path = null;


/**
 * The Swagger operation that this middleware handles.
 * Null indicates all operations for the path.
 * @type {string|null}
 */
Middleware.prototype.operation = null;


/**
 * The Swagger operationId that this middleware handles.
 * If this property is set, then {@link Middleware#path} and {@link Middleware#operation} must be null.
 * @type {string|null}
 */
Middleware.prototype.operationId = null;


/**
 * The priority of this middleware, relative to other middleware for the same operation.
 * @type {Middleware.priorities}
 */
Middleware.prototype.priority = null;


/**
 * The type of middleware (normal or error handler)
 * @type {Middleware.types}
 */
Middleware.prototype.type = null;


/**
 * The function that provides the middleware's implementation.
 * @type {function}
 */
Middleware.prototype.fn = null;
