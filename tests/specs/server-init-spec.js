var env = require('../test-environment');

describe('SwaggerServer initialization', function() {
  'use strict';

  it('should initialize settings correctly',
    function() {
      var server = env.createServer('foo');
      expect(server.settings).to.deep.equal({
        enableCORS: true,
        enableMocks: true
      });
    }
  );

  it('should initialize metadata correctly',
    function() {
      var server = env.createServer('foo');
      expect(server.metadata).to.deep.equal({
        swaggerFile: 'foo',
        swaggerObject: null,
        url: null,
        startedDate: null,
        specLoadedDate: null,
        error: null
      });
    }
  );

  it('should throw an error if the filename is not given',
    function() {
      expect(env.call(env.createServer)).to.throw(Error, 'The "swaggerFile" parameter is required');
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

  it('should merge the settings param',
    function() {
      var server = env.createServer('foo', {enableCORS: false, enableMocks: false, foo: 'bar'});
      expect(server.settings).to.deep.equal({
        enableCORS: false,
        enableMocks: false,
        foo: 'bar'
      });
    }
  );

});
