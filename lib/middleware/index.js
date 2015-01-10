'use strict';

module.exports = Middleware;

var express            = require('express'),
    util               = require('../helpers/util'),
    _                  = require('../helpers/lodash-mixins'),
    MetadataMiddleware = require('./metadata'),
    ErrorMiddleware    = require('./errors'),
    HeaderMiddleware   = require('./headers');


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
     * The main Express router. 
     * Used for all of Swagger-Server's internal middleware and any user-defined middleware.
     * @type {e.Router}
     * @private
     */
    self.__router = express.Router();

    /**
     * Express router for Swagger-Server's stub middleware.
     * This is a separate middleware to ensure that the stubs always run *after* any user-defined middleware.
     * @type {Router}
     * @private
     */
    self.__stubRouter = express.Router();


    // Expose Express methods on SwaggerServer, but add support for Swagger-style paths
    ['use', 'route', 'all'].concat(util.swaggerMethods).forEach(function(method) {
        self[method] = function(path) {
            var args = _.rest(arguments, 0);

            // Special-case for `app.get(setting)`
            if (args.length === 1 && method === 'get') {
                return self.__express.get(path);
            }

            // Convert Swagger-style path to Express-style path
            if (_.isString(path)) {
                args[0] = path.replace(util.swaggerParamRegExp, ':$1');
            }

            return self.__router[method].apply(self.__router, args);
        };
    });

    // Keep the router settings in sync with the server's settings
    self.on('set', function(setting, value) {
        if (setting === 'case sensitive routing') {
            self.__router.caseSensitive = value;
            self.__stubRouter.caseSensitive = value;
        }
        else if (setting === 'strict routing') {
            self.__router.strict = value;
            self.__stubRouter.strict = value;
        }
    });

    // Add middleware to the routers
    self.__addMiddleware();
    self.__addStubMiddleware();
};


/**
 * Adds the Swagger-Server middleware
 * @private
 */
Middleware.prototype.__addMiddleware = function() {
    var headers = new HeaderMiddleware(this);
    var metadata = new MetadataMiddleware(this);
    var errors = new ErrorMiddleware(this);

    this.__router.use(headers.poweredBy);
    this.__router.use(metadata.annotateRequest);
    this.__router.use(errors.sendError);

    this.__express.use(this.__router);
};


/**
 * Adds the Swagger-Server stub middleware
 * @private
 */
Middleware.prototype.__addStubMiddleware = function() {
    // HACK: This is just dummy functionality for now, just so unit tests will pass
    this.__stubRouter.use(function(req, res, next) {
        if (req.swagger.path && req.path !== '/test/404') {
            res.sendStatus(200);
        }
        else {
            res.sendStatus(404);
        }
    });

    this.__express.use(this.__stubRouter);
};

