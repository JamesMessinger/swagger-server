(function() {
  'use strict';

  var format = require('util').format;
  var _ = require('lodash');


  // User-registered error-handler middleware
  var registeredMiddleware = [];


  var errors = module.exports = {
    /**
     * Uses the given middleware function(s) as error-handlers.
     * @param {...function|function[]} middleware
     */
    use: function(middleware) {
      registeredMiddleware.push(_.rest(arguments, 0));
    },


    /**
     * Middleware that catches all errors and handles them appropriately
     */
    catchAll: function catchAll() {
      var errorHandlers = [];

      // Not actually an error handler, but this is the last non-error middleware in the chain.
      // So it always throws a 404 error
      errorHandlers.push(http404);

      // Log the error to the console
      errorHandlers.push(logError);

      // Add user-registered error handlers.  They get the first chance to handle any errors
      _.each(_.flatten(registeredMiddleware), function(fn) {
        errorHandlers.push(fn);
      });

      // If we get here, then all else has failed, so just return an HTTP error code
      errorHandlers.push(catchAllErrors);

      return errorHandlers;
    },


    /**
     * Creates an Error object and specifies an HTTP status code.
     *
     * @param {number} [status]   the HTTP status code
     * @param {string} message  the error message.  May include placeholder strings (%s, %d, %j)
     * @param {...*|*[]} params one or more params to be passed to {@link util#format}
     * @returns {Error}
     */
    createError: function createError(status, message, params) {
      var errorMessage;

      if (typeof(status) === 'number') {
        errorMessage = format.apply(null, _.rest(arguments, 1));
      }
      else {
        errorMessage = format.apply(status, _.rest(arguments));
        status = 500;
      }

      var err = new Error(errorMessage);
      err.status = status;
      return err;
    },


    /**
     * Creates a SyntaxError with a formatted string message.
     *
     * @param {string} message
     * @param {...*|*[]} params
     * @returns {SyntaxError}
     */
    createSyntaxError: function syntaxError(message, params)
    {
      var err = new SyntaxError(format.apply(null, [message].concat(_.rest(arguments))));
      err.status = 500;
      return err;
    }
  };


  /**
   * If the request gets to this middleware, then it's a 404
   */
  function http404(req, res, next) {
    throw errors.createError(404, 'Not Found');
  }


  /**
   * Logs the error to the console (stdErr)
   */
  function logError(err, req, res, next) {
    console.error(err.stack || err.toString());
    next(err);
  }


  /**
   * Catches errors and returns the appropriate HTTP error response.
   */
  function catchAllErrors(err, req, res, next) {
    var statusCode = err.status || 500;
    var errorMessage = err.message || 'Internal Server Error';
    res.status(statusCode).send(errorMessage);
  }

})();
