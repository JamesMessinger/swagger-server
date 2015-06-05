'use strict';
/**************************************************************************************************
 * This sample builds on top of Sample 1 and demonstrates a few more advanced features
 * of Swagger Server, such as setting options, loading mock data, and adding custom middleware logic.
 **************************************************************************************************/

process.env.DEBUG = 'swagger:*';

var util     = require('util'),
    swagger  = require('swagger-server'),
    Server   = swagger.Server,
    Resource = swagger.Resource;

// Create a Swagger Server from the PetStore.yaml file
var server = new Server();
server.parse('../sample1/PetStore.yaml');

// Enable Express' case-sensitive and strict options
// (so "/pets/Fido", "/pets/fido", and "/pets/fido/" are all different)
server.enable('case sensitive routing');
server.enable('strict routing');

// Initialize the data store with some mock data (REST resources)
server.dataStore.save(
  new Resource('/pets/Lassie', {name: 'Lassie', type: 'dog', tags: ['brown', 'white']}),
  new Resource('/pets/Clifford', {name: 'Clifford', type: 'dog', tags: ['red', 'big']}),
  new Resource('/pets/Garfield', {name: 'Garfield', type: 'cat', tags: ['orange']}),
  new Resource('/pets/Snoopy', {name: 'Snoopy', type: 'dog', tags: ['black', 'white']}),
  new Resource('/pets/Hello%20Kitty', {name: 'Hello Kitty', type: 'cat', tags: ['white']})
);

// Add custom middleware
server.patch('/pets/{petName}', function(req, res, next) {
  if (req.body.name !== req.params.petName) {
    // The pet's name has changed, so change its URL.
    // Start by deleting the old resource
    server.dataStore.delete(new Resource(req.path), function(err, pet) {
      if (pet) {
        // Merge the new data with the old data
        pet.merge(req.body);
      }
      else {
        // The old data had already been deleted, so just use the new data
        pet = req.body;
      }

      // Save the pet with the new URL
      server.dataStore.save(new Resource('/pets', req.body.name, pet), function(err, pet) {
        // Send the response
        res.json(pet.data);
      });
    });
  }
  else {
    next();
  }
});

// Add a custom error handler that returns errors as HTML
server.use(function(err, req, res, next) {
  res.status(err.status);
  res.type('html');
  res.send(util.format('<html><body><h1>%d Error!</h1><pre>%s</pre></body></html>', err.status, err.message));
});

// Start listening on port 8000 (the port number is specified in PetStore.yaml)
server.listen(function() {
  console.log('The Swagger Pet Store is now running at http://localhost:8000');
});
