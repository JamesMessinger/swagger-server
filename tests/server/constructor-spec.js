var swagger = require('../../');
var env = require('../test-environment');

describe('SwaggerServer constructor', function() {
    'use strict';

    it('should initialize state correctly',
        function() {
            var server = new swagger.Server('foo');
            expect(server.state).to.deep.equal({
                swagger: null,
                url: null,
                started: null,
                specLoaded: null,
                error: null,
                files: [],
                urls: []
            });
        }
    );

    it('should clone prototype.state',
        function() {
            var server = new swagger.Server('foo');

            // The server instance should have the same state as the prototype
            expect(server.state).to.deep.equal(swagger.Server.prototype.state);

            // But the "state" object should be a new instance
            expect(server.state).not.to.equal(swagger.Server.prototype.state);
        }
    );

    it('should clone prototype.middleware',
        function() {
            var server = new swagger.Server('foo');

            // The server instance should have a cloned copy of the middleware function
            expect(server.middleware).to.be.a('function');
            expect(swagger.Server.prototype.middleware).to.be.a('function');
            expect(server.middleware).not.to.equal(swagger.Server.prototype.middleware);
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
                return new swagger.Server('/this/file/does/not/exist');
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

});
