var swagger = require('../../');
var env = require('../test-environment');

describe('SwaggerServer.middleware', function() {
    'use strict';

//    it('forwards requests to registered middleware',
//        function(done) {
//            var server = new swagger.Server(env.files.minimal);
//
//            server.use(function(req, res, next) {
//                expect(req.path).to.equal('/foo/bar');
//                res.sendStatus(204);
//            });
//
//            // Run the server using Express rather than SwaggerServer.start()
//            env.supertest(server.middleware)
//                .get('/foo')
//                .expect(204, done);
//        }
//    );

// TODO: Start via Express, and send two requests simultaneously. The Swagger file should only get parsed once, but both requests should still be handled

// TODO: Register some mock middleware and make sure it doesn't get called when sending another HTTP request after calling stop()

//    it('should pass the http.Server instance to the callback',
//        function(done) {
//            var server = new swagger.Server(env.files.minimal);
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
//            var server = new swagger.Server(env.files.minimal);
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
//            env.nock.get('/minimal.yaml').replyWithFile(200, env.files.minimal);
//
//            var server = new swagger.Server(env.urls.minimal);
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
//                var server = new swagger.Server(env.files.ENOENT);
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
//                var server = new swagger.Server(env.files.minimal);
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
//                var server = new swagger.Server(env.files.minimal);
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
//                var server = new swagger.Server(env.files.minimal);
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
//                var server1 = new swagger.Server(env.files.minimal);
//                var server2 = new swagger.Server(env.files.externalRefs);
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

});
