var env = require('../test-environment');

describe('SwaggerServer.start', function() {
  'use strict';

  it('should be aliased as "SwaggerServer.listen"',
    function() {
      var server = env.createServer('foo');
      expect(server.start).to.equal(server.listen);
    }
  );

  it('should return the SwaggerServer instance',
    function() {
      var server = env.createServer('foo');
      var returnVal = server.start(sinon.spy());
      expect(returnVal).to.equal(server);
    }
  );

  // TODO: Check the SwaggerServer.metadata state
  // TODO: Start called twice

  it('should pass the http.Server instance to the callback',
    function(done) {
      var server = env.createServer(env.files.minimal);
      server.start(function(err, http) {
        expect(err).to.be.null;
        expect(http).to.be.an.instanceOf(require('http').Server);

        http.close(done);
      });
    }
  );

  it('should not throw an immediate error if the filename is invalid',
    function() {
      // This won't throw an error immediately, but it WILL throw an error when the server starts
      expect(env.call(env.createServer, 'this/file/doesnt/exist')).not.to.throw();
    }
  );

  it('should not throw an error if the filename is a URL',
    function() {
      expect(env.call(env.createServer, 'http://company.com/path/to/swagger.yaml')).not.to.throw();
    }
  );

});
