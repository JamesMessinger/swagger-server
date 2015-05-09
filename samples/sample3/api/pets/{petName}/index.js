'use strict';

var swagger   = require('swagger-server'),
    Resource  = swagger.Resource,
    dataStore = null;

module.exports = {
  /**
   * Initialization code.  This function runs before anything else in the file.
   */
  init: function(server) {
    // Get the server's data store, so we can use it later
    dataStore = server.get('mock data store');
  },

  /**
   * Detects when a pet's name changes, and updates its URL accordingly.
   */
  patch: function(req, res, next) {
    if (req.body.name !== req.params.petName) {
      // The pet's name has changed, so change its URL.
      // Start by deleting the old resource
      dataStore.delete(new Resource(req.path), function(err, pet) {
        if (pet) {
          // Merge the new data with the old data
          pet.merge(req.body);
        }
        else {
          pet = req.body;
        }

        // Save the pet with the new URL
        dataStore.save(new Resource('/pets', req.body.name, pet), function(err, pet) {
          // Send the response
          res.json(pet.data);
        });
      });
    }
    else {
      next();
    }
  }
};
