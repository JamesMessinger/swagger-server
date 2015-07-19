'use strict';

var _    = require('lodash'),
    util = require('./util');

module.exports = {
  /**
   * Patches an Express Router to support Swagger.
   * @param {e.Router|e.application} router
   * @param {e.Router|e.application} [target]
   */
  patch: function(router, target) {
    // By default, just patch the router's own methods.
    // If a target is given, then patch the router to call the target's methods
    target = target || router;

    // get(setting), which is different than get(path, fn)
    var get = router.get;

    // Wrap all of these methods to convert Swagger-style paths to Express-style paths
    var fns = {};
    ['use', 'route', 'all'].concat(util.swaggerMethods).forEach(function(method) {
      fns[method] = target[method];
      router[method] = function(path) {
        var args = _.drop(arguments, 0);

        // Special-case for `app.get(setting)`
        if (args.length === 1 && method === 'get') {
          return get.call(router, path);
        }

        // Convert Swagger-style path to Express-style path
        if (_.isString(path)) {
          args[0] = path.replace(util.swaggerParamRegExp, ':$1');
        }

        // Pass-through to the corresponding Express method
        var ret = fns[method].apply(target, args);

        if (router.__sortMiddleWare) {
          router.__sortMiddleWare();
        }

        return ret;
      };
    });
  }
};
