'use strict';

var debug = require('debug');
var format = require('util').format;
var _ = require('lodash');


// Used to find stack traces in errors
var stackTracePattern = /^    at .*\:\d+:\d+\)?$/m;


module.exports = {
    /**
     * Writes messages to stdout.
     * Log messages are suppressed by default, but can be enabled by setting the DEBUG variable.
     * @type {function}
     */
    debug: debug('swagger:server'),


    /**
     * Writes messages to stderr.
     * Warning messages are enabled by default, but can be suppressed by setting the WARN variable to "off".
     */
    warn: (function() {
        if (process.env.WARN === 'off') {
            return _.noop;
        }
        else {
            return function(err, message, params) {
                // Shift args if needed
                var formatArgs;
                if (_.isString(err)) {
                    formatArgs = _.rest(arguments, 0);
                    err = undefined;
                }
                else {
                    formatArgs = _.rest(arguments, 1);
                }

                console.warn(wrapError(err, formatArgs));
            };
        }
    })(),


    /**
     * Creates an Error object with a formatted message and an HTTP status code.
     *
     * @param   {number}    [status]    The HTTP status code (defaults to 500)
     * @param   {Error}     [err]       The original error, if any
     * @param   {string}    message     The error message.  May include format strings (%s, %d, %j)
     * @param   {...*}      [params]    One or more params to be passed to {@link util#format}
     * @returns {Error}
     */
    newError: function createError(status, err, message, params) {
        // Shift args if needed
        var formatArgs;
        if (_.isString(status)) {
            formatArgs = _.rest(arguments, 0);
            status = 500;
            err = undefined;
        }
        else if (_.isString(err)) {
            formatArgs = _.rest(arguments, 1);
            err = undefined;
        }
        else {
            formatArgs = _.rest(arguments, 2);
        }

        err = new Error(wrapError(err, formatArgs));
        err.status = status;
        return err;
    },


    /**
     * Creates a SyntaxError with a formatted message.
     *
     * @param   {string}    message     The error message.  May include format strings (%s, %d, %j)
     * @param   {Error}     [err]       The original error, if any
     * @param   {...*}      [params]    One or more params to be passed to {@link util#format}
     * @returns {SyntaxError}
     */
    newSyntaxError: function syntaxError(err, message, params) {
        // Shift args if needed
        var formatArgs;
        if (_.isString(err)) {
            formatArgs = _.rest(arguments, 0);
            err = undefined;
        }
        else {
            formatArgs = _.rest(arguments, 1);
        }

        err = new SyntaxError(wrapError(err, formatArgs));
        err.status = 500;
        return err;
    },


    /**
     * The HTTP methods that Swagger supports
     * (see https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#pathItemObject)
     */
    swaggerMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch']
};


/**
 * Returns an error message that includes full details of the original error.
 *
 * @param   {Error}     [err]           The original error, if any
 * @param   {*[]}       formatArgs      Arguments to be passed directly to {@link util#format}
 */
function wrapError(err, formatArgs) {
    var message = '';

    // Format the message string, if provided
    if (formatArgs.length > 0) {
        message = format.apply(null, formatArgs);
    }

    // Add detailed error info, if provided
    if (err) {
        if (message) {
            message += ': \n';
        }

        message += err.name + ': ' + err.stack;
    }

    return message;
}
