var swagger = require('../../');
var env = require('../test-environment');

describe('SwaggerServer initialization', function() {
  'use strict';

  it('should initialize settings correctly',
    function() {
      var server = new swagger.Server('foo');
      expect(server.settings).to.deep.equal({
        enableCORS: true,
        enableMocks: true
      });
    }
  );

  it('should initialize metadata correctly',
    function() {
      var server = new swagger.Server('foo');
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
      expect(env.call(swagger.Server)).to.throw(Error, 'The "swaggerFile" parameter is required');
    }
  );

  it('should throw an error if the "new" operator is not used',
    function() {
      expect(env.call(swagger.Server, 'foo')).to.throw(Error, 'The "new" operator is required');
    }
  );

  it('should not throw an immediate error if the filename is invalid',
    function() {
      // This won't throw an error immediately, but it WILL throw an error when the server starts
      function instantiate() {
        return new swagger.Server('this/file/doesnt/exist');
      }

      expect(instantiate).not.to.throw();
    }
  );

  it('should not throw an error if the filename is a URL',
    function() {
      function instantiate() {
        return new swagger.Server('http://company.com/path/to/swagger.yaml');
      }

      expect(instantiate).not.to.throw();
    }
  );

  it('should merge the settings param',
    function() {
      var server = new swagger.Server('foo', {enableCORS: false, enableMocks: false, foo: 'bar'});
      expect(server.settings).to.deep.equal({
        enableCORS: false,
        enableMocks: false,
        foo: 'bar'
      });
    }
  );

});
