'use strict';

module.exports = Middleware;

var _       = require('lodash'),
    express = require('express'),
    swagger = require('swagger-express-middleware'),
    util    = require('./util');


/* istanbul ignore next: empty constructor */
/**
 * Manages all Swagger-Server middleware and user-defined middleware.
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
     * The Swagger Middleware object that parses, validates, and mocks the Swagger API.
     * @type {exports.Middleware}
     * @private
     */
    self.__middleware = new swagger.Middleware(self.__express);


    /**
     * The main Express Router that all middleware gets added to
     * @type {e.Router}
     * @private
     */
    self.__router = express.Router();


    /**
     * The Express Router that contains the mock middleware.
     * This is middleware is in a separate router so that it always comes last.
     * @type {e.Router}
     * @private
     */
    self.__mockRouter = express.Router();


    self.__addMiddleware();
};


['use', 'route', 'all'].concat(util.swaggerMethods).forEach(function(method) {
    /**
     * Pass-through to Express's routing methods, but adds support for Swagger-style paths
     *
     * @param   {string}        [path]
     * The path can be Express-style (e.g. "/users/:username") or Swagger-style (e.g. "/users/{username}")
     *
     * @param   {...function}   fns
     * One or more middleware functions.
     *
     * @returns {SwaggerServer}
     */
    Middleware.prototype[method] = function(path, fns) {
        var args = _.drop(arguments, 0);

        // Special-case for `app.get(setting)`
        if (args.length === 1 && method === 'get') {
            return this.__express.get(path);
        }

        // Convert Swagger-style path to Express-style path
        if (_.isString(path)) {
            args[0] = path.replace(util.swaggerParamRegExp, ':$1');
        }

        // Pass-through to the corresponding Express method
        var retVal = this.__router[method].apply(this.__router, args);

        // Return the SwaggerServer instance for daisy-chaining
        return retVal === this.__router ? this : retVal;
    };
});


/**
 * Adds the Swagger-Server middleware
 * @private
 */
Middleware.prototype.__addMiddleware = function() {
    var self = this;
    var middleware = self.__middleware;

    // Add Swagger middleware.
    // Third-party middleware will also be added to this Router
    self.__express.use(self.__router);
    self.__router.use(
        poweredBy,
        middleware.metadata(),
        middleware.files(),
        middleware.CORS(),
        middleware.parseRequest(),
        middleware.validateRequest()
    );

    // The mock middleware always runs last
    self.__express.use(self.__mockRouter);
    self.__mockRouter.use(middleware.mock());


    /**
     * Sets the "X-Powered-By" header
     */
    function poweredBy(req, res, next) {
        if (self.enabled('x-powered-by')) {
            res.setHeader('X-Powered-By', 'Swagger Server');
        }
        next();
    }
};
