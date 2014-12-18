var swagger = require('../../');
var env = require('../test-environment');

describe('SwaggerServer.start', function() {
  'use strict';

  it('should be aliased as "SwaggerServer.listen"',
    function() {
      var server = new swagger.Server('foo');
      expect(server.start).to.equal(server.listen);
    }
  );

  it('should return the SwaggerServer instance',
    function() {
      var server = new swagger.Server('foo');
      var returnVal = server.start();
      expect(returnVal).to.equal(server);
    }
  );

  it('can be called without any arguments',
    function(done) {
      var server = new swagger.Server(env.files.minimal);
      server.start();
      server.on('start', function() {
        server.stop(done);
      });
    }
  );

  it('can be called with just a port number',
    function(done) {
      var server = new swagger.Server(env.files.minimal);
      server.start(3456);
      server.on('start', function() {
        expect(server.metadata.url.port).to.equal('3456');
        server.stop(done);
      });
    }
  );

//  it('can be called with just an options object',
//    function(done) {
//      var server = new swagger.Server(env.files.minimalHttps);
//      server.start({
//        key: '',
//        cert: ''
//      });
//      server.on('start', function() {
//        expect(server.metadata.url.protocol).to.equal('https:');
//        server.stop(done);
//      });
//    }
//  );

  // TODO: Check the SwaggerServer.metadata state after starting
  // TODO: Start called twice

  it('should pass the http.Server instance to the callback',
    function(done) {
      var server = new swagger.Server(env.files.minimal);
      server.start(function(err, httpServer) {
        expect(err).to.be.null;
        expect(httpServer).to.be.an.instanceOf(require('http').Server);

        server.stop(done);
      });
    }
  );

//  // TODO: Invalid filename should throw an error when started
//  it('should not throw an immediate error if the filename is invalid',
//    function() {
//      // This won't throw an error immediately, but it WILL throw an error when the server starts
//      expect(env.call(swagger.Server, 'this/file/doesnt/exist')).not.to.throw();
//    }
//  );
//
//  // TODO: Test with a URL
//  it('should not throw an error if the filename is a URL',
//    function() {
//      expect(env.call(swagger.Server, 'http://company.com/path/to/swagger.yaml')).not.to.throw();
//    }
//  );

});
