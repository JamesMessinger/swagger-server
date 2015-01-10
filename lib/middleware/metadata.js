'use strict';

module.exports = MetadataMiddleware;

var util = require('../helpers/util'),
    _    = require('../helpers/lodash-mixins');


/**
 * Middleware that annotates the HTTP request with Swagger metadata.
 * @param server
 */
function MetadataMiddleware(server) {
    var api;

    server.on('parsed', function(parsedApi) {
        api = parsedApi;
    });


    /**
     * Annotates the HTTP request with Swagger metadata
     * @type {function[]}
     */
    this.annotateRequest = [swaggerMetadata, swaggerPathMetadata, swaggerOperationMetadata];


    /**
     * Creates the `req.swagger` object.
     * NOTE: `req.swagger.api` is set, even if the request doesn't match a path or operation in the Swagger API
     */
    function swaggerMetadata(req, res, next) {
        /**
         * The Swagger Metadata that is added to each HTTP request.
         * This object is exposed as `req.swagger`.
         *
         * @name SwaggerMetadata
         */
        req.swagger = {
            /**
             * The complete Swagger API object.
             * (see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#swagger-object-)
             * @type {SwaggerObject|null}
             */
            api: api,

            /**
             * The Path API object.
             * (see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#pathItemObject)
             * @type {object|null}
             */
            path: null,

            /**
             * The Operation API object.
             * (see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#operationObject)
             * @type {object|null}
             */
            operation: null
        };

        next();
    }


    /**
     * Sets `req.swagger.path`
     * NOTE: `req.swagger.path` is set, even if the request doesn't match an operation in the path
     */
    function swaggerPathMetadata(req, res, next) {
        if (!api) return next();

        var basePath = normalizePath(api.basePath);
        var reqPath = normalizePath(req.path);
        var relativePath = normalizePath(reqPath.substr(basePath.length));
        req.route = req.route || {};

        // We only care about paths that are under the API's basePath
        if (!_.startsWith(reqPath, basePath)) {
            return next();
        }

        // Search for a matching path
        Object.keys(api.paths).some(function(key) {
            var pathName = normalizePath(key);

            if (pathName === relativePath) {
                // We found an exact match (i.e. a path with no parameters)
                req.swagger.path = api.paths[key];
                req.route.swaggerPath = key;
                return true;
            }
            else if (req.swagger.path === null && swaggerPathToRegExp(pathName).test(relativePath)) {
                // We found a possible match, but keep searching in case we find an exact match
                req.swagger.path = api.paths[key];
                req.route.swaggerPath = key;
            }
        });

        if (!req.swagger.path) {
            util.warn('WARNING! Unable to find a Swagger path that matches "%s"', req.path);
        }

        next();
    }


    /**
     * Sets the `req.swagger.operation` properties
     */
    function swaggerOperationMetadata(req, res, next) {
        var path = req.swagger.path;
        var method = req.method.toLowerCase();

        if (path && method in path) {
            req.swagger.operation = path[method];
        }

        next();
    }


    /**
     * Normalizes a path according to the server's case-sensitivity and strict-routing settings.
     */
    function normalizePath(path) {
        var caseSensitive = server.enabled('case sensitive routing');
        var strict = server.enabled('strict routing');

        if (!path) {
            return '';
        }

        if (!caseSensitive) {
            path = path.toLowerCase();
        }

        if (!strict && path.substr(-1) === '/') {
            path = path.substr(0, path.length - 1);
        }

        return path;
    }


    /**
     * Converts the given Swagger path pattern into a RegExp object.
     *
     * @param   {string}    swaggerPath     The Swagger path (e.g. "/users/{username}/orders/{orderId}")
     * @returns {RegExp}                    A RegExp for the path (e.g. /^/users\/([^/]+)/orders/([^/]+)$/)
     */
    function swaggerPathToRegExp(swaggerPath) {
        var pathPattern = swaggerPath.replace(util.swaggerParamRegExp, function(match, paramName) {
            return '([^/]+)';
        });

        return new RegExp('^' + pathPattern + '$');
    }
}
