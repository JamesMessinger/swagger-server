(function() {
  'use strict';

  var fs = require('fs');
  var swaggerMethods = require('./swagger-methods');
  var _ = require('lodash');


  // Used to build regular expressions for Swagger paths
  var swaggerPathParamPattern = /\{([^\/\}]+)}/g;

  var util = module.exports = {
    /**
     * Determines whether app is running in a development environment.
     * For consistency with Express.js, if the NODE_ENV environment variable is undefined,
     * it defaults to "development".
     * @returns {boolean}
     */
    isDevelopmentEnvironment: function() {
      return process.env.NODE_ENV === undefined || process.env.NODE_ENV === 'development';
    },


    /**
     * Just a helper function for opening files
     */
    openFile: function(file)
    {
      try {
        return fs.readFileSync(file, 'utf8');
      }
      catch (e) {
        throw new Error('Unable to read file "' + file + '": \n' + e.message);
      }
    },


    /**
     * Normalizes a path, by removing any trailing "/"
     * @param {string} path
     */
    normalizePath: function(path) {
      if (!path)
        return '';
      else if (path.substr(-1) === '/')
        return path.substr(0, path.length -1);
      else
        return path;
    },

    /**
     * Converts the given Swagger path pattern into a RegExp object.
     * Note: This function assumes the path has already been normalized.
     *
     * @param {string} swaggerPath      the Swagger path pattern (e.g. "/users/{username}")
     * @returns {RegExp}                A regular expression pattern (e.g. /\/users\/([^\/]+)/)
     */
    swaggerPathToRegExp: function(swaggerPath) {
      var params = [];
      var pathPattern = swaggerPath.replace(swaggerPathParamPattern, function(match, paramName) {
        params.push(paramName);
        return '([^\/]+)';
      });

      var pathRegExp = new RegExp('^' + pathPattern + '\/?$');
      pathRegExp.params = params;
      return pathRegExp;
    },

    /**
     * Returns the Swagger path parameters (i.e. { in: "path" }) for the given path.
     * Note: This function assumes the path has already been normalized.
     *
     * @param {string} swaggerPath    the Swagger path pattern (e.g. "/users/{username}")
     * @param {string} path           the actual path (e.g. "/users/johndoe")
     * @returns {object}              a map of path params and values (e.g. { username: "johndoe" })
     */
    getPathParams: function(swaggerPath, path) {
      var pathRegExp = util.swaggerPathToRegExp(swaggerPath);
      var values = pathRegExp.exec(path);

      var params = {};
      for (var i = 1; i < values.length; i++) {
        var paramName = pathRegExp.params[i - 1];
        var paramValue = values[i];

        params[paramName] = decodeURIComponent(paramValue);
      }

      return params;
    },


    /**
     * Finds the path in the Swagger spec that matches the given path.
     * @param {object} swaggerObject    the SwaggerObject
     * @param {string} reqPath          the requested path (e.g. "/users/jdoe")
     * @returns {string}                the Swagger path name (e.g. "/users/{username}"), or undefined if not found
     */
    findSwaggerPath: function(swaggerObject, reqPath) {
      var match;

      // Normalize the request path and remove the basePath
      var basePath = swaggerObject.basePath || '';
      var normalizedReqPath = util.normalizePath(reqPath.substr(basePath.length)) || '/';

      // Try to find an exact match
      _.each(swaggerObject.paths, function(pathObj, swaggerPath) {
        var normalizedSwaggerPath = util.normalizePath(swaggerPath);
        if (normalizedSwaggerPath === normalizedReqPath) {
          match = swaggerPath;
          return false; // exit the .each loop
        }
      });

      if (!match) {
        // No exact matches were found, so perform RegEx matches instead
        _.each(swaggerObject.paths, function(pathObj, swaggerPath) {
          // Only do RegEx matches for paths that have params
          if (swaggerPath.indexOf('{') >= 0) {
            if (util.swaggerPathToRegExp(swaggerPath).test(normalizedReqPath)) {
              match = swaggerPath;
              return false; // exit the .each loop
            }
          }
        });
      }

      if (!match) {
        console.warn('WARNING! Unable to find a Swagger path that matches "%s"', reqPath);
      }

      return match;
    },


    /**
     * Returns all of the defined parameters for the given path and operation.
     * @param {object} path   the PathItem object, from the Swagger spec
     * @param {operation} operation   the Operation object, from the Swagger spec
     */
    getParameters: function(path, operation) {
      // Get a combined list of all parameters for this operation and path
      var params = (operation.parameters || []).concat(path.parameters || []);

      // Remove duplicates, with the operation params taking precedence over the path params
      return _.unique(params, function(param) { return param.name + param.in; });
    },

    /**
     * Returns an array of the HTTP methods that are allowed for the given Swagger path.
     * @param {object} path   the PathItem object, from the Swagger spec
     * @returns {string[]}
     */
    getAllowedMethods: function(path) {
      return _.map(_.filter(swaggerMethods,
          function(operation) {
            return !!path[operation];
          }),
        function(operation) {
          return operation.toUpperCase();
        });
    },

    /**
     * Formats a date as RFC 7231 (e.g. "Tue, 15 Nov 1994 12:45:26 GMT")
     * @param date
     * @returns {string}
     */
    rfc7231: function(date) {
      var dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getUTCDay()];
      var monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()];
      return [dayName, ', ', pad(date.getUTCDate()), ' ', monthName, ' ', date.getUTCFullYear(), ' ',
        pad(date.getUTCHours()), ':', pad(date.getUTCMinutes()), ':', pad(date.getUTCSeconds()), ' GMT'].join('');
    }

  };


  // Returns the given number as a two-digit number (e.g. 4 => "04", 12 => "12")
  function pad(num) {
    return ('0' + num).substr(-2);
  }

})();
