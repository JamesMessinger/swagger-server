'use strict';

var debug       = require('debug'),
    swaggerUtil = require('swagger-express-middleware/lib/helpers/util');

module.exports = {
  /**
   * Writes messages to stdout.
   * Log messages are suppressed by default, but can be enabled by setting the DEBUG variable.
   *
   * @param   {string}    message     The error message.  May include format strings (%s, %d, %j)
   * @param   {...*}      [params]    One or more params to be passed to {@link util#format}
   * @type {function}
   */
  debug: debug('swagger:server'),

  /**
   * Writes messages to stderr.
   * Warning messages are enabled by default, but can be suppressed by setting the WARN variable to "off".
   *
   * @param   {Error}     [err]       The error, if any
   * @param   {string}    message     The warning message.  May include format strings (%s, %d, %j)
   * @param   {...*}      [params]    One or more params to be passed to {@link util#format}
   */
  warn: swaggerUtil.warn,

  /**
   * Creates an Error object with a formatted message and an HTTP status code.
   *
   * @param   {number}    [status]    The HTTP status code (defaults to 500)
   * @param   {Error}     [err]       The original error, if any
   * @param   {string}    message     The error message.  May include format strings (%s, %d, %j)
   * @param   {...*}      [params]    One or more params to be passed to {@link util#format}
   * @returns {Error}
   */
  newError: swaggerUtil.newError,

  /**
   * Regular Expression that matches Swagger path params.
   */
  swaggerParamRegExp: swaggerUtil.swaggerParamRegExp,

  /**
   * The HTTP methods that Swagger supports
   * (see https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#pathItemObject)
   */
  swaggerMethods: swaggerUtil.swaggerMethods
};
