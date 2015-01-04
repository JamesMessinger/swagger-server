'use strict';

module.exports = SwaggerServer;

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var app = require('./app');
var router = require('./router');
var middleware = require('./middleware');
var parser = require('./parser');
var watcher = require('./watcher');


/**
 * Creates the Swagger-Server middleware function that can be run standalone or
 * mounted to an existing Node/Connect/Express server.
 *
 * @constructor
 * @extends App
 * @extends Router
 * @extends Middleware
 * @extends Parser
 * @extends Watcher
 * @extends EventEmitter
 */
function SwaggerServer(swaggerPath) {
    var swaggerServer = function(req, res, next) {
        // Delay the request until the Swagger API is parsed
        swaggerServer.__whenParsed(function() {
            swaggerServer.__express(req, res, next);
        });
    };

    [EventEmitter, app, router, middleware, parser, watcher].forEach(function(base) {
        _.extend(swaggerServer, base.prototype);
        if (base.prototype.__init) {
            base.prototype.__init.call(swaggerServer);
        }
    });

    return swaggerServer;
}
