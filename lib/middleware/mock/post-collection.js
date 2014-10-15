(function() {
  'use strict';

  var debug = require('../../helpers/debug').mocks;
  var _ = require('../../helpers/lodash-deep');
  var dataStore = require('./data-store');


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

    // Get the required properties of the resource
    var requiredProperties = _.resultDeep(_.findWhere(
      req.swagger.operation.parameters, { in: 'body' }), 'schema.required');

    // Assume that the first required field is the unique ID,
    // and use it as the path for the new resource
    var resourceId = _.find(_.values(_.pick(newResource, requiredProperties)), function(value) {
      // Ignore object and array properties
      return (!(_.isPlainObject(value) || _.isArray(value)));
    });

    // If we still don't have a valid path, then store the resource at the collection path
    var resourcePath = req.path;
    if (resourceId !== undefined) {
      if (resourcePath.substr(-1) !== '/') resourcePath += '/';

      // Sanitize the value, so it makes a good URL
      if (_.isDate(resourceId)) {
        resourcePath += resourceId.toJSON();
      }
      else {
        // Make sure the value isn't too long and doesn't contain invalid characters
        resourcePath += _(resourceId).toString().substr(0, 100).replace(/\W/g, '');
      }
    }
    debug('The URL for the new resource is %s', resourcePath);

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

})();
