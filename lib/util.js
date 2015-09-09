'use strict';

var debug       = require('debug'),
    swaggerUtil = require('swagger-express-middleware/lib/helpers/util');

/**
 * Writes messages to stdout.
 * Log messages are suppressed by default, but can be enabled by setting the DEBUG variable.
 *
 * @param   {string}    message     The error message.  May include format strings (%s, %d, %j)
 * @param   {...*}      [params]    One or more params to be passed to {@link util#format}
 * @type {function}
 */
exports.debug = debug('swagger:server');

/**
 * Writes messages to stderr.
 * Warning messages are enabled by default, but can be suppressed by setting the WARN variable to "off".
 *
 * @param   {Error}     [err]       The error, if any
 * @param   {string}    message     The warning message.  May include format strings (%s, %d, %j)
 * @param   {...*}      [params]    One or more params to be passed to {@link util#format}
 */
exports.warn = swaggerUtil.warn;

/**
 * Regular Expression that matches Swagger path params.
 */
exports.swaggerParamRegExp = /\{([^/}]+)}/g;
