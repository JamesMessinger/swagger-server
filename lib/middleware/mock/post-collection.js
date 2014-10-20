(function() {
  'use strict';

  var debug = require('./debug');
  var _ = require('lodash');
  var dataStore = require('./data-store');
  var util = require('../../helpers/util');


  /**
   * POST /path/to/a/collection
   * POST /path/to/a/file.ext
   *
   * This mock creates a new REST resource containing the request body.
   * It tries to intelligently generate a URL for the new resource, based on the
   * required fields in the JSON schema.  If there is no schema, or there are no
   * usable required fields, then it's assumed that this is not actually a REST collection,
   * and instead this mock behaves like the "post-resource" mock, storing
   * the request body at the collection URL.
   *
   * If there is already a resource at the generated URL, then this mock behaves
   * like the "post-resource" mock, and attempts to merge the new resource with
   * the existing one.  If a merge is not possible, then the existing resource
   * is completely overwritten.
   *
   * If the Swagger spec defines a "Location" response header, then this mock
   * will automatically add the header and set its value to the generated URL.
   */
  module.exports = function postCollectionMock(req, res, next) {
    debug('Swagger-Server Mock is handling the "%s" %s operation', req.path, req.method);

    // If there's no request body, then there's nothing to do
    var newResource = req.body;
    if (_.isEmpty(newResource)) {
      return next();
    }

    // Get the JSON schema for the resource
    var resourceSchema = _.result(_.findWhere(req.swagger.operation.parameters, { in: 'body' }), 'schema');

    // Determine the resource's "ID", based on its schema
    var resourceId = determineResourceId(newResource, resourceSchema);

    // Build the URL to the new resource, based on it's "ID" field
    var resourcePath = buildResourcePath(req.path, resourceId);

    // Store the merged resource
    newResource = dataStore.mergeResource(resourcePath, newResource);

    // Set the response body (unless it's already been set by custom middleware)
    if (!res.body) res.body = newResource;

    // See if the Swagger spec defines a "Location" header
    if (res.swagger.getHeader('Location') === undefined) {
      console.warn(
        'WARNING! Your Swagger schema doesn\'t include the "Location" header for the "%s" %s operation. '
        + 'We recommend that you add it, so the server can inform clients of the new resource\'s URL',
        req.path, req.method);
    }
    else {
      // Don't overwrite the "Location" header if it was already set by custom middleware
      if (!res.get('Location')) {
        // Set the "Location" header, since it's defined in the Swagger spec
        res.location(resourcePath);
      }
    }

    next();
  };


  /**
   * Returns the "ID" value for the given resource.
   * If the ID field doesn't have a value, then a value is generated for it.
   * @param {object} resource     The resource object
   * @param {object} schema       The JSON schema for the resource object
   * @returns {string|number|undefined}    The value of the ID (either a string or number), or undefined if no ID field is found
   */
  function determineResourceId(resource, schema) {
    if (!resource || !schema || !schema.properties) {
      return undefined;
    }

    var idName, idValue;

    // First, try to find an "ID" property
    var exactMatches = ['id', 'key'];
    var suffixMatches = ['id', 'key', 'number', 'no', 'num', 'nbr', 'code'];

    _.each(schema.properties, function(propSchema, propName) {
      var lowercase = propName.toLowerCase();
      if (exactMatches.indexOf(lowercase) >= 0) {
        // We found an exact match, so use this property as the "ID" property
        idName = propName;
        return false; // exit the .each loop
      }
      else if (!idName) {
        _.each(suffixMatches, function(suffix) {
          if (lowercase.substr(-suffix.length) === suffix) {
            // We found a *possible* match, but keep looking in case we find an exact match
            idName = propName;
            return false; // exit the INNER .each loop, but NOT the outer one
          }
        });
      }
    });

    if (!idName) {
      // We didn't find an "ID" property, so assume that the first required property is the ID
      var requiredProperties = _.pick(resource, schema.required);

      // Find the first required property that is NOT an object or array
      _.each(requiredProperties, function(propValue, propName) {
        if (!_.isPlainObject(propValue) && !_.isArray(propValue)) {
          idName = propName;
          return false; // exit the .each loop
        }
      });
    }

    if (idName) {
      // OK, we found an ID field.  Now determine if we need to assign it a value
      idValue = resource[idName];
      if (idValue === undefined) {
        var idSchema = schema.properties[idName];
        if (idSchema.type === 'integer' || idSchema.type === 'number') {
          idValue = parseInt(_.uniqueId());
        }
        else if (idSchema.type === 'string') {
          idValue = _.uniqueId(idName);
        }

        resource[idName] = idValue;
      }
    }

    return idValue;
  }


  /**
   * Builds a URL for the given resource ID
   * @param {string} collectionPath     The path of the resource collection (e.g. "/users")
   * @param {string} resourceId         The unique ID of the resource (e.g. "jdoe")
   * @returns {string}                  The URL for the resource (e.g. "/users/jdoe")
   */
  function buildResourcePath(collectionPath, resourceId) {
    collectionPath = util.normalizePath(collectionPath);

    if (resourceId !== undefined) {
      // Sanitize the value, so it makes a good URL
      if (_.isDate(resourceId)) {
        collectionPath += '/' + resourceId.toJSON();
      }
      else {
        // Make sure the value isn't too long and doesn't contain invalid characters
        collectionPath += '/' + encodeURIComponent(_(resourceId).toString().substr(0, 100));
      }
    }

    debug('The URL for the new resource is %s', collectionPath);
    return collectionPath;
  }

})();
