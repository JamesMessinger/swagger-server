'use strict';

var format = require('util').format;
var _ = require('lodash');

module.exports = {
    /**
     * Creates an Error object with a formatted message and an HTTP status code.
     *
     * @param   {number}    [status]    The HTTP status code (defaults to 500)
     * @param   {string}    message     The error message.  May include format strings (%s, %d, %j)
     * @param   {...*|*[]}  params      One or more params to be passed to {@link util#format}
     * @returns {Error}
     */
    createError: function createError(status, message, params) {
        var errorMessage, args;

        if (_.isString(status)) {
            args = _.rest(arguments, 0);
            status = 500;
        }
        else {
            args = _.rest(arguments, 1);
        }

        errorMessage = format.apply(null, args);
        var err = new Error(errorMessage);
        err.status = status;
        return err;
    },


    /**
     * Creates a SyntaxError with a formatted message.
     *
     * @param   {string}    message     The error message.  May include format strings (%s, %d, %j)
     * @param   {...*|*[]}  params      One or more params to be passed to {@link util#format}
     * @returns {SyntaxError}
     */
    createSyntaxError: function syntaxError(message, params) {
        var err = new SyntaxError(format.apply(null, arguments));
        err.status = 500;
        return err;
    },


    /**
     * The HTTP methods that Swagger supports
     * (see https://github.com/wordnik/swagger-spec/blob/master/versions/2.0.md#pathItemObject)
     */
    swaggerMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch']
};
