describe('createServer function', function() {
    'use strict';

    var env = require('./test-environment');
    var swaggerServer = require('../');
    beforeEach(env.beforeEach);
    afterEach(env.afterEach);

    it('should export the "createServer" function',
        function() {
            expect(swaggerServer).to.be.a('function');
        }
    );

    it('should throw an error if the filename is not given',
        function() {
            expect(env.call(swaggerServer)).to.throw(Error, 'No Swagger file path was specified');
        }
    );

    it('should work without the "new" operator',
        function(done) {
            var server = swaggerServer(env.files.petStore);
            currentTest.swaggerServers.push(server);
            server.on('parsed', function() {
                expect(server).to.be.a('function');
                done();
            });
        }
    );

    it('should work with the "new" operator',
        function(done) {
            var server = new swaggerServer(env.files.petStore);
            currentTest.swaggerServers.push(server);
            server.on('parsed', function() {
                expect(server).to.be.a('function');

                done();
            });
        }
    );

    it('should not throw an immediate error if the filename is invalid',
        function(done) {
            env.disableWarningsForThisTest();

            // No exception is thrown because the file is parsed asynchronously
            var server = env.swaggerServer(env.files.ENOENT);

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
            env.disableWarningsForThisTest();

            // No exception is thrown because the file is parsed asynchronously
            var server = env.swaggerServer(env.urls.error404);

            // The error is thrown asynchronously
            server.on('error', function(err) {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.status).to.equal(500);

                done();
            });
        }
    );

});
