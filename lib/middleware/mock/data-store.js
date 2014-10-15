(function() {
  'use strict';

  var _ = require('lodash');
  var error = require('../../errors').createError;

  // A simple in-memory map of paths to resources
  var pathMap = {};

  // Metadata for each resource
  var metadataMap = {};

  // Null until initialized
  var swaggerServer = null;


  /**
   * Used by the Swagger-Server Mock middleware to store REST resources.
   * @constructor
   */
  function DataStore() {
    /**
     * Returns the resource at the given path.
     * @param {string} path
     * @returns {*|undefined}  returns the resource for the given path, or `undefined` if not found
     */
    this.fetchResource = function fetchResource(path) {
      return pathMap[normalizePath(path)];
    };

    /**
     * Returns the metadata for the resource at the given path.
     * @param {string} path
     * @returns {object|undefined}  returns the metadata for the given path, or `undefined` if not found
     */
    this.fetchResourceMetadata = function fetchResourceMetadata(path) {
      return metadataMap[normalizePath(path)];
    };

    /**
     * Returns all resources under the given collection path that match the given filter
     * @param {string} collectionPath   (e.g. "/path/to/a/collection/")
     * @param {object} [filter]          optional filter object (e.g. { "name":"John", "address.city":"New York" })
     * @returns {*|undefined}  returns an array of all matching resources. The array is empty if no matches were found.
     */
    this.fetchCollection = function fetchCollection(collectionPath, filter) {
      var collection = [];

      // Loop through all the resources
      collectionPath = normalizePath(collectionPath);
      _.each(pathMap, function(resource, path) {
        // If the path starts with the collectionPath, then add it to the output list
        if (path.indexOf(collectionPath) === 0) {
          collection.push(resource);
        }
      });

      return _.whereDeep(collection, filter);
    };

    /**
     * Returns the metadata the given collection path
     * @param {string} collectionPath   (e.g. "/path/to/a/collection/")
     * @returns {object|undefined}  returns the metadata for the given collection, or `undefined` if not found
     */
    this.fetchCollectionMetadata = function fetchCollectionMetadata(collectionPath) {
      var collection = [];

      // Loop through all the resources
      collectionPath = normalizePath(collectionPath);
      _.each(metadataMap, function(resource, path) {
        // If the path starts with the collectionPath, then add it to the list
        if (path.indexOf(collectionPath) === 0) {
          collection.push(resource);
        }
      });

      return {
        createdOn: _.min(collection, 'createdOn').createdOn || new Date(),
        modifiedOn: _.max(collection, 'modifiedOn').modifiedOn || new Date()
      };
    };

    /**
     * Stores the given resource at the given path, completely overwriting any
     * existing resource at that path.
     * @param {string} path
     * @param {*} resource
     * @returns {*} the new resource
     */
    this.overwriteResource = this.createResource = function overwriteResource(path, resource) {
      path = normalizePath(path);

      // Clone the resource to ensure there are no external references to it
      pathMap[path] = _.cloneDeep(resource);
      metadataMap[path] = createMetadata();

      return resource;
    };

    /**
     * Stores the given resource at the given path, merging it with any
     * existing resource at that path.  If merging is not possible, then
     * the existing resource is completely overwritten.
     * @param {string} path
     * @param {*} resource
     * @returns {*} the resulting merged resource
     */
    this.mergeResource = function mergeResource(path, resource) {
      path = normalizePath(path);

      // If there's an existing resource, then merge 'em!
      var existing = pathMap[path];
      var existingMetadata = metadataMap[path];
      if (existing) {
        // We can only merge objects and arrays
        if (_.isPlainObject(existing) || _.isArray(existing)) {
          resource = _.merge(existing, resource);
        }
      }

      // Store the merged resource
      pathMap[path] = _.cloneDeep(resource);
      metadataMap[path] = createMetadata(existingMetadata);

      return resource;
    };

    /**
     * Removes the resource at the given path
     * @param {string} path
     * @returns {*} the deleted resource
     */
    this.removeResource = function removeResource(path) {
      path = normalizePath(path);
      var existing = pathMap[path];

      delete pathMap[path];
      delete metadataMap[path];

      return existing;
    };

    /**
     * Removes all resources under the given path that match the given filter
     * @param {string} collectionPath
     * @param {object} [filter]          optional filter object (e.g. { "name":"John", "address.city":"New York" })
     * @returns {*[]} an array of the deleted resources. The array is empty if nothing was deleted.
     */
    this.removeCollection = function removeCollection(collectionPath, filter) {
      var deleted = [];

      // Loop through all the resources
      collectionPath = normalizePath(collectionPath);
      _.each(pathMap, function(resource, path) {
        // If the path starts with the collectionPath, then delete it
        if (path.indexOf(collectionPath) === 0) {
          if (filter) {
            // Determine if this resource matches the filter
            var filterMatch = _.whereDeep([resource], filter);
            if (filterMatch.length === 0) {
              // It doesn't match the filter, so skip it
              return;
            }
          }

          deleted.push(resource);
          delete pathMap[path];
          delete metadataMap[path];
        }
      });

      return deleted;
    };


    /**
     * Initializes the data store
     * @param {SwaggerServer} server
     */
    this._init = function init(server) {
      swaggerServer = server;
      return this;
    };


    /**
     * Ensures that paths are stored consistently (case-insensitive)
     */
    function normalizePath(path) {
      // Validate the path
      if (!_.isString(path) || _.isEmpty(path)) {
        throw error(500, 'Attempted to store a resource using an invalid path (%j)', path);
      }

      // Get the base path (if any), and remove any trailing slash
      var basePath = swaggerServer.swaggerObject ? swaggerServer.swaggerObject.basePath || '' : '';
      if (basePath.substr(-1) === '/') {
        basePath = basePath.substr(0, basePath.length - 1);
      }

      // Paths are case-insensitive
      var normalized = path.trim().toLowerCase();
      basePath = basePath.trim().toLowerCase();

      // Remove the basePath from the path
      if (normalized.indexOf(basePath) === 0) {
        normalized = normalized.substr(basePath.length);
      }

      // Make sure there's a trailing slash
      if (normalized.substr(-1) !== '/') {
        normalized += '/';
      }

      return normalized;
    }


    /**
     * Creates metadata for a resources, optionally merged with existing metadata.
     * @param {object} [existingMetadata]
     * @returns {object}
     */
    function createMetadata(existingMetadata) {
      existingMetadata = existingMetadata || {};

      return {
        createdOn: existingMetadata.createdOn || new Date(),
        modifiedOn: new Date()
      };
    }
  }

  module.exports = new DataStore();

})();
