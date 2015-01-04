//describe('SwaggerServer.start', function() {
//    'use strict';
//
//    var env = require('../test-environment');
//    beforeEach(env.beforeEach);
//    afterEach(env.afterEach);
//
//    it('should be aliased as "SwaggerServer.listen"',
//        function() {
//            var server = env.swaggerServer('foo');
//            expect(server.start).to.equal(server.listen);
//        }
//    );
//
//    it('should return the SwaggerServer instance',
//        function() {
//            var server = env.swaggerServer('foo');
//            var returnVal = server.start(sinon.spy());
//            expect(returnVal).to.equal(server);
//        }
//    );
//
//    it('can be called without any arguments',
//        function(done) {
//            var server = env.swaggerServer(env.files.minimal);
//            server.start();
//            server.on('start', function() {
//                server.stop(done);
//            });
//        }
//    );
//
//    it('can be called with just a port number',
//        function(done) {
//            var server = env.swaggerServer(env.files.minimal);
//            server.start(3456);
//            server.on('start', function() {
//                expect(server.state.url.port).to.equal('3456');
//                expect(server.state.url.protocol).to.equal('http:');
//                server.stop(done);
//            });
//        }
//    );
//
//    it('can be called with just SSL options',
//        function(done) {
//            var server = env.swaggerServer(env.files.minimalHttps);
//            server.start(env.sslKey);
//            server.on('start', function() {
//                expect(server.state.url.protocol).to.equal('https:');
//                server.stop(done);
//            });
//        }
//    );
//
//    it('can be called with just a port number and SSL options',
//        function(done) {
//            var server = env.swaggerServer(env.files.minimalHttps);
//            server.start(4567, env.sslKey);
//            server.on('start', function() {
//                expect(server.state.url.port).to.equal('4567');
//                expect(server.state.url.protocol).to.equal('https:');
//                server.stop(done);
//            });
//        }
//    );
//
//    it('can be called with just a port number and a callback',
//        function(done) {
//            var server = env.swaggerServer(env.files.minimal);
//            server.start(5678, function() {
//                expect(server.state.url.port).to.equal('5678');
//                expect(server.state.url.protocol).to.equal('http:');
//                server.stop(done);
//            });
//        }
//    );
//
//    it('can be called with a port number, SSL options, and a callback',
//        function(done) {
//            var started = false;
//            var server = env.swaggerServer(env.files.minimalHttps);
//            server.start(6789, env.sslKey, callback);
//
//            server.on('start', function() {
//                expect(server.state.url.port).to.equal('6789');
//                expect(server.state.url.protocol).to.equal('https:');
//                started = true;
//            });
//
//            function callback(err, httpServer) {
//                expect(started).to.be.true();
//                expect(httpServer).to.be.an.instanceOf(require('https').Server);
//                server.stop(done);
//            }
//        }
//    );
//
//    it('uses HTTP instead of HTTPS if no SSL options are given',
//        function(done) {
//            var server = env.swaggerServer(env.files.minimalHttps);
//            server.start(function() {
//                expect(server.state.url.protocol).to.equal('http:');
//                server.stop(done);
//            });
//        }
//    );
//
//    it('uses the port number in the Swagger spec instead of the default port',
//        function(done) {
//            var server = env.swaggerServer(env.files.minimalWithHost);
//            server.start(1111, function(err, httpServer) {
//                expect(httpServer.address().port).to.equal(3000);
//                expect(server.state.url.port).to.equal('3000');
//                server.stop(done);
//            });
//        }
//    );
//
//    it('can start two servers simultaneously, on different ports',
//        function(done) {
//            var server1 = env.swaggerServer(env.files.minimal);
//            var server2 = env.swaggerServer(env.files.externalRefs);
//
//            server1.start(1111, function(err, httpServer) {
//                expect(err).to.be.null();
//                expect(httpServer.address().port).to.equal(1111);
//                expect(server1.state.url.port).to.equal('1111');
//                stopBoth();
//            });
//
//            server2.start(2222, function(err, httpServer) {
//                expect(err).to.be.null();
//                expect(httpServer.address().port).to.equal(2222);
//                expect(server2.state.url.port).to.equal('2222');
//                stopBoth();
//            });
//
//            function stopBoth() {
//                if (server1.state.started && server2.state.started) {
//                    server1.stop(function() {
//                        server2.stop(done);
//                    });
//                }
//            }
//        }
//    );
//
//    it('should pass the http.Server instance to the callback',
//        function(done) {
//            var server = env.swaggerServer(env.files.minimal);
//            server.start(function(err, httpServer) {
//                expect(err).to.be.null();
//                expect(httpServer).to.be.an.instanceOf(require('http').Server);
//
//                server.stop(done);
//            });
//        }
//    );
//
//    it('should update SwaggerServer.state',
//        function(done) {
//            var server = env.swaggerServer(env.files.minimal);
//            server.start(1111, function(err, httpServer) {
//                // The prototype.state should not be modified
//                expect(swagger.Server.prototype.state).to.deep.equal({
//                    swagger: null,
//                    url: null,
//                    started: null,
//                    specLoaded: null,
//                    error: null,
//                    files: [],
//                    urls: []
//                });
//
//                expect(server.state.swagger).to.deep.equal(env.files.parsed.minimal);
//                expect(server.state.url.href).to.equal('http://localhost:1111/');
//                expect(server.state.started).to.be.an.instanceOf(Date);
//                expect(server.state.specLoaded).to.be.an.instanceOf(Date);
//                expect(server.state.started).to.be.at.least(server.state.specLoaded);
//                expect(server.state.error).to.be.null();
//                expect(server.state.files).to.have.same.members([env.files.minimal]);
//                expect(server.state.urls).to.be.an('array').with.lengthOf(0);
//
//                server.stop(done);
//            });
//        }
//    );
//
//    it('should update SwaggerServer.state when using a URL',
//        function(done) {
//            env.nock().get('/minimal.yaml').replyWithFile(200, env.files.minimal);
//
//            var server = env.swaggerServer(env.urls.minimal);
//            server.start(1111, function(err, httpServer) {
//                // The prototype.state should not be modified
//                expect(swagger.Server.prototype.state).to.deep.equal({
//                    swagger: null,
//                    url: null,
//                    started: null,
//                    specLoaded: null,
//                    error: null,
//                    files: [],
//                    urls: []
//                });
//
//                expect(server.state.swagger).to.deep.equal(env.files.parsed.minimal);
//                expect(server.state.url.href).to.equal('http://localhost:1111/');
//                expect(server.state.started).to.be.an.instanceOf(Date);
//                expect(server.state.specLoaded).to.be.an.instanceOf(Date);
//                expect(server.state.started).to.be.at.least(server.state.specLoaded);
//                expect(server.state.error).to.be.null();
//                expect(server.state.files).to.be.an('array').with.lengthOf(0);
//                expect(server.state.urls).to.have.lengthOf(1);
//                expect(server.state.urls[0].href).to.equal(env.urls.minimal);
//
//                server.stop(done);
//            });
//        }
//    );
//
//
//    describe('Failure tests', function() {
//        it('should abort if a parsing error occurs',
//            function(done) {
//                var server = env.swaggerServer(env.files.ENOENT);
//                server.start(function(err, httpServer) {
//                    expect(err).to.be.an.instanceOf(Error);
//                    expect(err.message).to.match(/Swagger-Server cannot start due to the following error/);
//                    expect(httpServer).to.be.undefined();
//                    server.stop(done);
//                });
//            }
//        );
//
//        it('should not restart if called multiple times',
//            function(done) {
//                var counter = 0;
//                var server = env.swaggerServer(env.files.minimal);
//
//                server.start(function(err) {
//                    expect(err).to.be.null();
//
//                    // This will error, since the server is already running
//                    server.start(function(err, httpServer) {
//                        expect(err).to.be.an.instanceOf(Error);
//                        expect(err.message).to.match(/Swagger-Server is already running/);
//                        expect(httpServer).to.be.undefined();
//                        if (++counter === 2) server.stop(done);
//                    });
//                });
//
//                // This will error, even though it's called before the server has finished starting
//                server.start(function(err, httpServer) {
//                    expect(err).to.be.an.instanceOf(Error);
//                    expect(err.message).to.match(/Swagger-Server is already running/);
//                    expect(httpServer).to.be.undefined();
//                    if (++counter === 2) server.stop(done);
//                });
//            }
//        );
//
//        it('should not restart if it has been stopped',
//            function(done) {
//                var server = env.swaggerServer(env.files.minimal);
//                server.start(function(err) {
//                    expect(err).to.be.null();
//
//                    server.stop();
//                    server.start(function(err, httpServer) {
//                        expect(err).to.be.an.instanceOf(Error);
//                        expect(err.message).to.match(/Swagger-Server has been stopped/);
//                        expect(httpServer).to.be.undefined();
//                        server.stop(done);
//                    });
//                });
//            }
//        );
//
//        it('should not start if it is stopped while starting',
//            function(done) {
//                var server = env.swaggerServer(env.files.minimal);
//
//                // Start the server (which is asynchronous),
//                // but then cancel the start operation by calling `stop`
//                server.start(callback);
//                server.stop();
//
//                function callback(err, httpServer) {
//                    expect(err).to.be.an.instanceOf(Error);
//                    expect(err.message).to.match(/Swagger-Server has been stopped/);
//                    expect(httpServer).to.be.undefined();
//                    server.stop(done);
//                }
//            }
//        );
//
//        it('throws an error when two servers attempt to start simultaneously on the same port',
//            function(done) {
//                var server1 = env.swaggerServer(env.files.minimal);
//                var server2 = env.swaggerServer(env.files.externalRefs);
//
//                server1.start(1111, function(err, httpServer) {
//                    expect(err).to.be.null();
//                    expect(httpServer.address().port).to.equal(1111);
//                    expect(server1.state.url.port).to.equal('1111');
//                });
//
//                server2.start(1111, function(err, httpServer) {
//                    expect(err).to.be.an.instanceOf(Error);
//                    expect(err.message).to.match(/Make sure port 1111 is not already in use/);
//                    expect(httpServer).to.be.undefined();
//                    server1.stop(done);
//                });
//            }
//        );
//    });
//
//});
