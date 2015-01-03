var swaggerServer = require('../lib');
var env = require('./test-environment');

describe('createServer function', function() {
    'use strict';

    it('should throw an error if the filename is not given',
        function() {
            expect(env.call(swaggerServer)).to.throw(Error, 'No Swagger file path was specified');
        }
    );

    it('should work without the "new" operator',
        function() {
            var server = swaggerServer(env.files.minimal);
            expect(server).to.be.a('function');
        }
    );

    it('should work with the "new" operator',
        function() {
            var server = new swaggerServer(env.files.minimal);
            expect(server).to.be.a('function');
        }
    );

    it('should not throw an immediate error if the filename is invalid',
        function(done) {
            // No exception is thrown because the file is parsed asynchronously
            var server = swaggerServer(env.files.ENOENT);

            // The error is thrown asynchronously
            server.on('error', function(err) {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.status).to.equal(500);
                expect(err.message).to.contain('ENOENT');
                done();
            });
        }
    );

    it('should not throw an immediate error if the URL is invalid',
        function(done) {
            // No exception is thrown because the file is parsed asynchronously
            var server = swaggerServer(env.urls.error404);

            // The error is thrown asynchronously
            server.on('error', function(err) {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.status).to.equal(500);
                done();
            });
        }
    );

});
