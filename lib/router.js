'use strict';

module.exports = Router;


/**
 * Routes Swagger paths to the Express middleware.
 * @constructor
 * @extends e.Router
 */
function Router() {}


/**
 * Initializes the Router
 * @private
 */
Router.prototype.__init = function() {
};


Router.prototype.use = function() {};
Router.prototype.route = function() {};
Router.prototype.all = function() {};
Router.prototype.get = function(path) {
    if (arguments.length === 1) {
        return this.__express.get(path);
    }
};
Router.prototype.post = function() {};
Router.prototype.put = function() {};
