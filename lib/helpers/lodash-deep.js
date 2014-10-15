(function() {
  'use strict';

  var _ = module.exports = require('lodash');

  /**
   * Works just like `_.result`, but supports nested properties/functions
   * @param {object} [obj]
   * @param {string} key
   */
  _.resultDeep = function resultDeep(obj, key) {
    // "my.deep.property" => ["my", "deep", "property"]
    var propNames = key.split('.');

    // Traverse each property/function
    for (var i = 0; i < propNames.length; i++) {
      var propName = propNames[i];
      obj = _.result(obj, propName);

      // Exit the loop early if we get a falsy value
      if (!obj) break;
    }

    return obj;
  };

  /**
   * Works just like `_.pluck`, but supports nested properties/functions
   * @param {*[]|object|string} [obj]
   * @param {string} prop
   */
  _.pluckDeep = function pluckDeep(obj, prop) {
    var result = [];

    // Loop through each value in the collection
    _.each(obj, function(value) {
      // Get the deep property value
      result.push(_.resultDeep(value, prop));
    });

    return result;
  };

  /**
   * Works just like `_.where`, but supports nested properties/functions
   * @param {*[]|object|string} [obj]
   * @param {object} props
   */
  _.whereDeep = function whereDeep(obj, props) {
    var result = [];

    // Loop through each value in the collection
    _.each(obj, function(value) {

      // Determine if this value matches all of the given properties
      var isMatch = true;
      _.each(props, function(whereValue, whereProp) {
        // Get the deep value of the `where` property
        var deepPropValue = _.resultDeep(value, whereProp);

        // Does the deep property value match the `where` value?
        if (_.isArray(whereValue) && _.isArray(deepPropValue)) {
          isMatch = _.intersection(whereValue, deepPropValue).length === whereValue.length;
        }
        else if (deepPropValue !== whereValue) {
          isMatch = false;
        }

        return isMatch; // exit the .each loop if not a match
      });

      // If all properties matched, then add it to the results
      if (isMatch)
        result.push(value);
    });

    return result;
  };

})();
