(function() {
  'use strict';

  var debug = require('../helpers/debug').spec;
  var fs = require('fs');
  var path = require('path');
  var http = require('http');
  var url = require('url');
  var yaml = require('js-yaml');
  var swaggerSchema = require('swagger-schema-official/schema');
  var util = require('./../helpers/util');
  var _ = require('./../helpers/lodash-deep');
  var validateSchema = require('./validate-schema');
  var syntaxError = require('../errors').createSyntaxError;


  // The state for the current schema parsing operation
  var parseState = {
    // The directory where the Swagger file is located
    // (used for resolving relative file references)
    swaggerSourceDir: null,

    // The entire SwaggerObject
    // (used for resolving schema references)
    swaggerObject: null,

    // A map of resolved "$ref" pointers to their values
    resolvedPointers: {}
  };


  module.exports = {
    /**
     * Parses the given Swagger file, validates it, and dereferences "$ref" pointers.
     *
     * @param {string} swaggerFile
     * the path of a YAML or JSON file.
     *
     * @param {function} callback
     * the callback function that will be passed the parsed SwaggerObject
     */
    parse: function parse(swaggerFile, callback) {
      // Create a new state object for this parse operation
      parseState = {
        swaggerSourceDir: path.dirname(swaggerFile),
        resolvedPointers: {}
      };

      try {
        // Parse the Swagger spec
        debug('Parsing the Swagger spec "%s"', swaggerFile);
        parseState.swaggerObject = yaml.safeLoad(util.openFile(swaggerFile));
        debug('Swagger spec parsed successfully');
      }
      catch (e) {
        return doCallback(callback, syntaxError('Error in "%s". \n%s', swaggerFile, e.message));
      }

      // Make sure it's an object
      if (!_.isPlainObject(parseState.swaggerObject)) {
        return doCallback(callback, syntaxError('"%s" is not a valid Swagger spec', swaggerFile));
      }

      // Validate the version number
      var version = parseFloat(parseState.swaggerObject.swagger);
      if (!(isFinite(version) && version >= 2 && version < 3)) {
        return doCallback(callback, syntaxError(
          'Error in "%s". \nUnsupported Swagger version: %d. Swagger-Server only supports version 2.x',
          swaggerFile, version));
      }

      // Dereference the SwaggerObject by resolving "$ref" pointers
      dereference(parseState.swaggerObject, '', function(err, swaggerObject) {
        // We're done parsing, so clear the state
        parseState = null;

        if (!err) {
          try {
            // Validate the spec against the Swagger 2.0 schema
            validateSchema.validate(swaggerObject, swaggerSchema);
          }
          catch (e) {
            err = e;
          }
        }

        // We're done.  Invoke the callback.
        doCallback(callback, err, swaggerObject);
      });
    }
  };


  /**
   * Asynchronously invokes the given callback function with the given parameter.
   * This allows the call stack to unwind, which is necessary because there can be a LOT of
   * recursive calls when dereferencing large Swagger specs.
   * @param {function} callback
   * @param {*} [err]
   * @param {*} [param1]
   * @param {*} [param2]
   */
  function doCallback(callback, err, param1, param2) {
    setImmediate(callback, err, param1, param2);
  }


  /**
   * Dereferences the given Swagger spec, replacing "$ref" pointers
   * with their corresponding object references.
   * @param {object} obj
   * @param {string} schemaPath
   * @param {function} callback
   */
  function dereference(obj, schemaPath, callback) {
    function dereferenceNextItem(err) {
      if (err || keys.length === 0) {
        // We're done!  Invoke the callback
        return doCallback(callback, err, obj);
      }

      var key = keys.pop();
      var value = obj[key];
      var fullPath = schemaPath + key;

      if (_.has(value, '$ref')) {
        // We found a "$ref" pointer!  So resolve it.
        var pointerPath = fullPath + '/$ref';
        var pointerValue = value.$ref;

        resolvePointer(pointerPath, pointerValue, function(err, reference, alreadyResolved) {
          if (err || alreadyResolved) {
            obj[key] = reference;
            dereferenceNextItem(err);
          }
          else {
            // Recursively dereference the resolved reference
            dereference(reference, pointerPath, function(err, reference) {
              obj[key] = reference;
              dereferenceNextItem(err);
            });
          }
        });
      }
      else if (_.isPlainObject(value) || _.isArray(value)) {
        // Recursively dereference each item in the object/array
        dereference(value, fullPath, function(err, reference) {
          obj[key] = reference;
          dereferenceNextItem(err);
        });
      }
      else {
        // This is just a normal value (string, number, boolean, date, etc.)
        // so just skip it and dereference the next item.
        dereferenceNextItem();
      }
    }

    schemaPath += '/';

    // Loop through each item in the object/array
    var keys = _.keys(obj);
    dereferenceNextItem();
  }


  /**
   * Resolves a "$ref" pointer.
   * @param {string} pointerPath
   * @param {string} pointerValue
   * @param {function} callback
   */
  function resolvePointer(pointerPath, pointerValue, callback) {
    var resolved;

    if (_.isEmpty(pointerValue)) {
      doCallback(callback, syntaxError('Empty $ref pointer at "%s"', pointerPath));
    }

    function returnResolvedValue(err, resolved, alreadyResolved) {
      if (!err && resolved === undefined) {
        err = syntaxError('Unable to resolve %s.  The path "%s" could not be found in the Swagger file.',
          pointerPath, pointerValue);
      }

      debug('Resolved %s => %s', pointerPath, pointerValue);
      doCallback(callback, err, resolved, alreadyResolved);
    }

    function asyncCallback(err, data) {
      if (err || data === undefined) {
        err = syntaxError('Unable to resolve %s.  An error occurred while downloading JSON data from %s : \n%s',
          pointerPath, pointerValue, err ? err.message : 'File Not Found');
      }

      // Now that we've finished downloaded the data,
      // merge it into the placeholder object that was created earlier
      data = _.merge(parseState.resolvedPointers[pointerValue], data);
      return returnResolvedValue(err, data);
    }

    try {
      // If we've already resolved this pointer, then return the resolved value
      if (_.has(parseState.resolvedPointers, pointerValue)) {
        return returnResolvedValue(null, parseState.resolvedPointers[pointerValue], true);
      }

      // Schema Pointers
      if (pointerValue.indexOf('#/') === 0) {
        // "#/paths/users/responses/200" => "paths.users.responses.200"
        var deepProperty = pointerValue.substr(2).replace(/\//g, '.');

        // Get the property value from the schema
        resolved = _.resultDeep(parseState.swaggerObject, deepProperty);
        parseState.resolvedPointers[pointerValue] = resolved;
        return returnResolvedValue(null, resolved);
      }

      // URL Pointers
      if (pointerValue.indexOf('http://') === 0
        || pointerValue.indexOf('https://') === 0
        || pointerValue.indexOf('file://') === 0) {
        // Set the resolved value to an empty object for now,
        // to prevent multiple simultaneous downloads of the same URL.
        // We'll populate the object once we finish downloading the file,
        // so all the other references will end up pointing to the populated object.
        parseState.resolvedPointers[pointerValue] = {};

        var parsedUrl = url.parse(pointerValue);
        var swaggerBaseUrl = (parseState.swaggerObject.host || '').toLowerCase();

        if (parsedUrl.host === swaggerBaseUrl
        || parsedUrl.hostname === swaggerBaseUrl
        || parsedUrl.hostname === 'localhost') {
          // The URL is pointing to a local file
          return getJsonFromFile(parsedUrl.pathname, asyncCallback);
        }
        else {
          // It's a remote URL
          return getJsonFromUrl(parsedUrl, asyncCallback);
        }
      }


      // Definitions Pointers
      // Swagger allows a shorthand reference syntax (e.g. "Product" => "#/definitions/Product")
      resolved = _.result(parseState.swaggerObject.definitions, pointerValue);
      parseState.resolvedPointers[pointerValue] = resolved;
      return returnResolvedValue(null, resolved);
    }
    catch (e) {
      doCallback(callback, e);
    }
  }


  /**
   * Reds JSON data from the given file path and returns the parsed object to a callback
   * @param {string} filePath
   * @param {function} callback - function(err, data)
   */
  function getJsonFromFile(filePath, callback) {
    try {
      var data = null;

      // Get the file path, relative to the Swagger file's directory WITHOUT the extension
      var ext = path.extname(filePath);
      var basefilePath = path.join(parseState.swaggerSourceDir, path.dirname(filePath), path.basename(filePath, ext));

      // Try to find the file in JSON or YAML format
      _.each(['.yaml', '.json'], function(ext) {
        if (fs.existsSync(basefilePath + ext)) {
          // Parse the JSON or YAML file
          data = yaml.safeLoad(util.openFile(basefilePath + ext));
        }
      });

      callback(null, data || undefined);
    }
    catch (e) {
      callback(e);
    }
  }


  /**
   * Downloads JSON data from the given URL and returns the parsed object to a callback
   * @param {object} url        - the parsed URL
   * @param {function} callback - function(err, data)
   */
  function getJsonFromUrl(url, callback) {
    try {
      var options = {
        host: url.host,
        hostname: url.hostname,
        port: url.port,
        path: url.path,
        auth: url.auth,
        headers: { 'Content-Type': 'application/json' }
      };

      var req = http.get(options, function(res) {
        res.setEncoding('utf8');
        var body = '';

        res.on('data', function(data) {
          body += data;
        });

        res.on('end', function() {
          if (res.statusCode >= 400) {
            return callback(new Error(body));
          }

          try {
            var parsedObject = JSON.parse(body);
            callback(null, parsedObject);
          }
          catch (e) {
            callback(e);
          }
        });
      });

      req.setTimeout(5000);
      req.on('timeout', function() {
        req.abort();
      });

      req.on('error', function(e) {
        callback(e);
      });
    }
    catch (e) {
      callback(e);
    }
  }

})();
