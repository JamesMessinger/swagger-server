describe('App.listen', function() {
    'use strict';

    var env = require('../test-environment');
    var http = require('http');

    beforeEach(env.beforeEach);
    afterEach(env.afterEach);

    it('should be aliased as "start"',
        function() {
            var server = env.swaggerServer(env.files.petStore);
            var httpServer = server.start(function() {
                httpServer.close();
            });
        }
    );

    it('should return the http.Server instance',
        function() {
            var server = env.swaggerServer(env.files.petStore);
            var returnVal = server.listen();
            expect(returnVal).to.be.an.instanceOf(http.Server);
        }
    );

    it('can be called without any arguments',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var httpServer = server.listen();
            httpServer.on('listening', function() {
                done();
            });
        }
    );

    it('can be called with just a port number',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var httpServer = server.listen(3456);
            httpServer.on('listening', function() {
                expect(httpServer.address().port).to.equal(3456);
                done();
            });
        }
    );

    it('can be called with just a port number and a callback',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var httpServer = server.listen(5678, function() {
                expect(httpServer.address().port).to.equal(5678);
                done();
            });
        }
    );

    it('can be called with all parameters of net.Server.listen',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var httpServer = server.listen(6789, 'localhost', 100, function() {
                expect(httpServer.address().port).to.equal(6789);
                done();
            });
        }
    );

    it('uses the port number in the Swagger spec if no port number is given',
        function(done) {
            var server = env.swaggerServer(env.files.petStoreWithPort);
            var httpServer = server.listen(function() {
                expect(httpServer.address().port).to.equal(3000);
                done();
            });
        }
    );

    it('uses the given port number instead of the port number in the Swagger spec',
        function(done) {
            var server = env.swaggerServer(env.files.petStoreWithPort);
            var httpServer = server.listen(1111, function() {
                expect(httpServer.address().port).to.equal(1111);
                done();
            });
        }
    );

    it('should not pass anything to the callback',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            server.listen(function() {
                expect(arguments).to.have.lengthOf(0);
                done();
            });
        }
    );

    it('can start multiple SwaggerServers simultaneously, on different ports',
        function(done) {
            var server1 = env.swaggerServer(env.files.petStore);
            var server2 = env.swaggerServer(env.files.petStoreExternalRefs);
            var counter = 0;

            var httpServer1 = server1.listen(1111, function() {
                expect(httpServer1.address().port).to.equal(1111);
                if (++counter === 2) done();
            });

            var httpServer2 = server2.listen(2222, function() {
                expect(httpServer2.address().port).to.equal(2222);
                if (++counter === 2) done();
            });
        }
    );

    it('can start multiple HTTP servers from the same SwaggerServer instance',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var counter = 0;

            var httpServer1 = server.listen(1111, function() {
                expect(httpServer1.address().port).to.equal(1111);
                if (++counter === 2) done();
            });

            var httpServer2 = server.listen(2222, function() {
                expect(httpServer2.address().port).to.equal(2222);
                if (++counter === 2) done();
            });
        }
    );


    describe('Failure tests', function() {

        beforeEach(env.disableWarningsForThisTest);

        it('should call the callback, even if a parsing error occurs',
            function(done) {
                var server = env.swaggerServer(env.files.ENOENT);

                var onError = sinon.spy();
                server.on('error', onError);

                server.listen(function() {
                    sinon.assert.calledOnce(onError);
                    done();
                });
            }
        );

        it('cannot start two servers simultaneously on the same port',
            function(done) {
                var server1 = env.swaggerServer(env.files.petStore);
                var server2 = env.swaggerServer(env.files.petStoreExternalRefs);

                var httpServer1 = server1.listen(1111);
                var httpServer2 = server2.listen(1111);

                httpServer2.on('error', function(err) {
                    expect(err.message).to.contain('EADDRINUSE');
                    expect(httpServer1.address().port).to.equal(1111);
                    expect(httpServer2.address()).to.be.null();
                    done();
                });
            }
        );
    });

});
