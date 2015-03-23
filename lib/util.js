'use strict';

var debug = require('debug'),
    _     = require('lodash'),
    util  = require('swagger-express-middleware/lib/helpers/util');

// Clone and extend the Swagger-Express-Middleware `util` object
module.exports = _.extend(_.clone(util), {
    /**
     * Writes messages to stdout.
     * Log messages are suppressed by default, but can be enabled by setting the DEBUG variable.
     *
     * @param   {string}    message     The error message.  May include format strings (%s, %d, %j)
     * @param   {...*}      [params]    One or more params to be passed to {@link util#format}
     * @type {function}
     */
    debug: debug('swagger:server')
});
