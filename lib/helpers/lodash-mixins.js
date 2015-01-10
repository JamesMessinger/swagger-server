(function() {
    'use strict';
    
    var _ = module.exports = require('lodash');


    /**
     * Checks if a string or array starts with a given substring or item.
     * @param   {*[]|string|null}   collection
     * @param   {*|string}          item
     * @returns {boolean}
     */
    _.startsWith = function startsWith(collection, item) {
        return collection && collection.indexOf(item) === 0;
    };

})();
