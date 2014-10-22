(function() {
  'use strict';

  var _ = require('lodash');
  var error = require('../../errors').createError;
  var util = require('../../helpers/util');


  // An array of resources in the data store
  var resources = [/*
    {
      collectionPath: '/users',
      resourcePath: '/users/jdoe',
      resource: {},
      metadata: {
        createdOn: Date(),
        modifiedOn: Date()
      }
    }
  */];

  // Null until initialized
  var swaggerServer = null;


  /**
   * Used by the Swagger-Server Mock middleware to store REST resources.
   * @constructor
   */
  function DataStore() {
    /**
     * Returns the resource at the given path.
     * @param {string} path    the resource path (e.g. "/users/jdoe")
     * @returns {*|undefined}  returns the resource for the given path, or `undefined` if not found
     */
    this.fetchResource = function fetchResource(path) {
      path = normalizePath(path);
      var resource = _.findWhere(resources, { resourcePath: path });
      return resource === undefined ? undefined : resource.resource;
    };


    /**
     * Stores the given resource at the given path, completely overwriting any existing resource at that path.
     *
     * @param {string} path
     * the resource path (e.g. "/users/jdoe")
     *
     * @param {string} [collectionPath]
     * the collection path (e.g. "/users").  If not specified, defaults to one path segment above `path`.
     * For example, if `path` is "/products/widget/reviews/123", the default `collectionPath` is "/products/widget/reviews".
     *
     * @param {*} resource
     * The resource to be stored at the given path.  A structured clone on this resource will be stored,
     * NOT the original resource object.
     *
     * @returns {*} the new resource
     */
    this.overwriteResource = this.createResource = function overwriteResource(path, collectionPath, resource) {
      return storeResource(path, collectionPath, resource, false);
    };


    /**
     * Stores the given resource at the given path, merging it with any
     * existing resource at that path.  If merging is not possible, then
     * the existing resource is completely overwritten.
     *
     * @param {string} path
     * the resource path (e.g. "/users/jdoe")
     *
     * @param {string} [collectionPath]
     * the collection path (e.g. "/users").  If not specified, defaults to one path segment above `path`.
     * For example, if `path` is "/products/widget/reviews/123", the default `collectionPath` is "/products/widget/reviews".
     *
     * @param {*} resource
     * The resource to be merged at the given path.
     *
     * @returns {*} the resulting merged resource
     */
    this.mergeResource = function mergeResource(path, collectionPath, resource) {
      return storeResource(path, collectionPath, resource, true);
    };


    /**
     * Removes the resource at the given path
     * @param {string} path           the resource path (e.g. "/users/jdoe")
     * @returns {*} the deleted resource
     */
    this.removeResource = function removeResource(path) {
      path = normalizePath(path);
      var existing = _.remove(resources, { resourcePath: path });
      return existing.length > 0 ? existing[0].resource : undefined;
    };


    /**
     * Returns the metadata for the resource at the given path.
     * @param {string} path         the resource path (e.g. "/users/jdoe")
     * @returns {object|undefined}  returns the metadata for the given path, or `undefined` if not found
     */
    this.fetchResourceMetadata = function fetchResourceMetadata(path) {
      path = normalizePath(path);
      var resource = _.findWhere(resources, { resourcePath: path });
      return resource === undefined ? undefined : resource.metadata;
    };


    /**
     * Returns all resources in the given collection path, optionally filtered by the given criteria
     * @param {string} collectionPath     the collection path (e.g. "/users")
     * @param {object} [filter]           optional filter criteria (e.g. { "name":"John", "address.city":"New York" })
     * @returns {*|undefined}  returns an array of all matching resources. The array is empty if no matches were found.
     */
    this.fetchCollection = function fetchCollection(collectionPath, filter) {
      collectionPath = normalizePath(collectionPath);
      var collection = _.where(resources, { collectionPath: collectionPath });

      // If there's no filter, then just return all resources in the collection
      if (!filter) {
        return _.pluck(collection, 'resource');
      }

      // Find resources that match the filter
      var matches = [];
      _.each(collection, function(resource) {
        var filterMatch = _.whereDeep([resource.resource], filter);
        if (filterMatch.length > 0) {
          matches.push(resource.resource);
        }
      });
      return matches;
    };


    /**
     * Removes all resources in the given collection path, optionally filtered by the given criteria
     * @param {string} collectionPath    the collection path (e.g. "/users")
     * @param {object} [filter]          optional filter criteria (e.g. { "name":"John", "address.city":"New York" })
     * @returns {*[]} an array of the deleted resources. The array is empty if nothing was deleted.
     */
    this.removeCollection = function removeCollection(collectionPath, filter) {
      collectionPath = normalizePath(collectionPath);
      var deleted;

      // if there's no filter, then just remove everything in the collection
      if (!filter) {
        deleted = _.remove(resources, { collectionPath: collectionPath });
        return _.pluck(deleted, 'resource');
      }

      // Only remove the resources that match the filter
      var collection = _.where(resources, { collectionPath: collectionPath });
      deleted = [];
      _.each(collection, function(resource) {
          var filterMatch = _.whereDeep([resource.resource], filter);
          if (filterMatch.length > 0) {
            deleted.push(resources.splice(resources.indexOf(resource), 1));
          }
      });
      return deleted;
    };


    /**
     * Returns the metadata for the given collection path
     * @param {string} collectionPath   the collection path (e.g. "/users")
     * @returns {object|undefined}  returns the metadata for the given collection, or `undefined` if not found
     */
    this.fetchCollectionMetadata = function fetchCollectionMetadata(collectionPath) {
      collectionPath = normalizePath(collectionPath);
      var collection = _.where(resources, { collectionPath: collectionPath });

      if (collection.length === 0) {
        return undefined;
      }

      return {
        createdOn: _.min(collection, 'createdOn').createdOn || new Date(),
        modifiedOn: _.max(collection, 'modifiedOn').modifiedOn || new Date()
      };
    };


    /**
     * Initializes the singleton DataStore instance
     * @param {SwaggerServer} server
     */
    this._init = function init(server) {
      swaggerServer = server;
      return this;
    };


    /**
     * The actual resource-storage logic.
     */
    function storeResource(path, collectionPath, resource, merge) {
      // Shift args if necessary
      if (resource === undefined) {
        resource = collectionPath;
        collectionPath = undefined;
      }

      path = normalizePath(path);
      collectionPath = collectionPath ? normalizePath(collectionPath) : inferCollectionPath(path);
      resource = _.cloneDeep(resource);

      // Remove any existing resource at this path
      var existing = _.remove(resources, { resourcePath: path });
      var existingMetadata;

      if (merge && existing.length > 0) {
        var existingResource = existing[0].resource;
        existingMetadata = existing[0].metadata;

        // We can only merge objects and arrays
        if (_.isPlainObject(existingResource) || _.isArray(existingResource)) {
          resource = _.merge(existingResource, resource);
        }
      }

      // Store the merged resource
      resources.push({
        collectionPath: collectionPath,
        resourcePath: path,
        resource: resource,
        metadata: createMetadata(existingMetadata)
      });

      return resource;
    }


    /**
     * Ensures that paths are stored consistently (case-insensitive)
     */
    function normalizePath(path) {
      // Validate the path
      if (!_.isString(path) || _.isEmpty(path)) {
        throw error(500, 'Attempted to store a resource using an invalid path (%j)', path);
      }

      // Get the base path (if any)
      var basePath = swaggerServer.swaggerObject ? swaggerServer.swaggerObject.basePath : '';
      basePath = util.normalizePath(basePath);

      // Paths are case-insensitive
      path = path.trim().toLowerCase();
      basePath = basePath.trim().toLowerCase();

      // Remove the basePath from the path
      if (path.indexOf(basePath) === 0) {
        path = path.substr(basePath.length);
      }

      return util.normalizePath(path);
    }


    /**
     * Infers the collection path for the given resource path.
     * The inferred collection path is just one path segment above `resourcePath`.
     * For example, if `resourcePath` is "/products/widget/reviews/123", the returned value is "/products/widget/reviews".
     *
     * NOTE: This function assumes that `resourcePath` has already been normalized
     *
     * @param {string} resourcePath
     * @returns {string}
     */
    function inferCollectionPath(resourcePath) {
      var lastSlash = resourcePath.lastIndexOf('/');

      if (lastSlash <= 0) {
        // The resource is at the root level, so the collection path is "/", which gets normalized to an empty string
        return '';
      }
      else {
        // Return everything before the last slash
        return resourcePath.substr(0, lastSlash);
      }
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
