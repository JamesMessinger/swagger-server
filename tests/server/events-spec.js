var swaggerServer = require('../../');
var env = require('../test-environment');
var http = require('http');
var path = require('path');

describe('SwaggerServer events', function() {
    'use strict';

    it('should fire the "ready" event when with a local file',
        function(done) {
            var server = new swaggerServer(env.files.externalRefs);
            server.on('ready', function(api, metadata) {
                expect(api).to.deep.equal(env.files.parsed.externalRefs);
                expect(metadata).to.deep.equal(env.files.metadata.externalRefs);
                done();
            });
        }
    );

    it('should fire the "ready" event when created with a URL',
        function(done) {
            env.nock()
                .get('/external-refs.yaml').replyWithFile(200, env.files.externalRefs)
                .get('/pet.yaml').replyWithFile(200, env.files.pet)
                .get('/error.yaml').replyWithFile(200, env.files.error);

            var server = new swaggerServer(env.urls.externalRefs);
            server.on('ready', function(api, metadata) {
                expect(api).to.deep.equal(env.files.parsed.externalRefs);
                expect(metadata).to.deep.equal(env.urls.metadata.externalRefs);
                done();
            });
        }
    );

    it('should only fire the "ready" event once for multiple requests',
        function(done) {
            var counter = 0;

            // Instantiate the server.
            // This will trigger the "ready" event once it's done parsing the file
            var server = new swaggerServer(env.files.externalRefs);

            server.on('ready', function() {
                counter++;
            });

            // Start the server.
            // This should NOT trigger "ready" event.
            var httpServer = server.listen(function() {
                // Make a request.
                // This should NOT trigger "ready" event.
                env.supertest(httpServer)
                    .get('/foo')
                    .expect(404)
                    .end(function(err) {
                        if (err) return done(err);

                        // Make a second request.
                        // This should NOT trigger "ready" event
                        env.supertest(httpServer)
                            .get('/bar')
                            .expect(404)
                            .end(function(err) {
                                if (err) return done(err);

                                // Stop the server.
                                // This should NOT trigger a "ready" event
                                server.close(function() {
                                    expect(counter).to.equal(1);
                                    done();
                                });
                            })
                    });
            });
        }
    );

//
//    it('should fire the same events when started via Express',
//        function(done) {
//            var onSpecChange = sinon.spy();
//            var onSpecLoaded = sinon.spy();
//            var onStart = sinon.spy();
//
//            var server = new swagger.Server(env.files.minimal);
//            server.on('specChange', onSpecChange);
//            server.on('specLoaded', onSpecLoaded);
//            server.on('start', onStart);
//
//            var callback = sinon.spy(function(err) {
//                if (err) return done(err);
//
//                // Make sure the "specLoaded" and "start" events were fired
//                sinon.assert.calledOnce(onSpecLoaded);
//                sinon.assert.calledOnce(onStart);
//
//                // The "specChange" event should not have fired
//                sinon.assert.notCalled(onSpecChange);
//
//                // Make sure they were fired in the correct order
//                sinon.assert.callOrder(onSpecLoaded, onStart, callback);
//
//                // "onSpecLoaded" should have been called with the Swagger object
//                expect(onSpecLoaded.firstCall.args[0]).to.be.null();
//                expect(onSpecLoaded.firstCall.args[1]).to.deep.equal(env.files.parsed.minimal);
//
//                // "onStart" should have been called without any args
//                expect(onStart.firstCall.args).to.have.lengthOf(0);
//
//                // the server should have returned a 404 error
//                expect(callback.firstCall.args[0]).to.be.null();
//                expect(callback.firstCall.args[1]).to.have.property('statusCode', 404);
//
//                server.stop(done);
//            });
//
//            // Run the server using Express rather than SwaggerServer.start()
//            env.supertest(server.middleware)
//                .get('/foo')
//                .expect(404)
//                .end(callback);
//        }
//    );
//
//    it('should fire "specChange" and "specLoaded" when the Swagger file is changed',
//        function(done) {
//            var onSpecChange = sinon.spy();
//            var onSpecLoaded = sinon.spy();
//            var onStart = sinon.spy();
//
//            var server = new swagger.Server(env.files.minimal);
//            server.on('specChange', onSpecChange);
//            server.on('specLoaded', onSpecLoaded);
//            server.on('start', onStart);
//
//            var callback = sinon.spy(function(err) {
//                if (err) done(err);
//
//                // Trigger a "specChange" event
//                env.touchFile(env.files.minimal);
//
//                // This should be triggered when the file is edited
//                server.once('specLoaded', function() {
//                    // The "specLoaded" event should have fired twice
//                    sinon.assert.calledTwice(onSpecLoaded);
//
//                    // But these events should only fire once
//                    sinon.assert.calledOnce(onSpecChange);
//                    sinon.assert.calledOnce(onStart);
//
//                    // The callback should have only been called once
//                    sinon.assert.calledOnce(callback);
//
//                    // "onSpecChange" should have been called with no params
//                    expect(onSpecChange.firstCall.args).to.have.lengthOf(0);
//
//                    // "onSpecLoaded" should have been called with the Swagger object
//                    expect(onSpecLoaded.secondCall.args[0]).to.be.null();
//                    expect(onSpecLoaded.secondCall.args[1]).to.deep.equal(env.files.parsed.minimal);
//
//                    server.stop(done);
//                });
//            });
//
//            server.start(callback);
//        }
//    );
//
//    it('should fire "specChange" and "specLoaded" when a referenced file is changed',
//        function(done) {
//            var onSpecChange = sinon.spy();
//            var onSpecLoaded = sinon.spy();
//            var onStart = sinon.spy();
//
//            var server = new swagger.Server(env.files.externalRefs);
//            server.on('specChange', onSpecChange);
//            server.on('specLoaded', onSpecLoaded);
//            server.on('start', onStart);
//
//            var callback = sinon.spy(function(err) {
//                if (err) done(err);
//
//                // Trigger a "specChange" event
//                env.touchFile(env.files.pet);
//
//                // This should be triggered when the file is edited
//                server.once('specLoaded', function() {
//                    // The "specLoaded" event should have fired twice
//                    sinon.assert.calledTwice(onSpecLoaded);
//
//                    // But these events should only fire once
//                    sinon.assert.calledOnce(onStart);
//                    sinon.assert.calledOnce(onSpecChange);
//
//                    // The callback should have only been called once
//                    sinon.assert.calledOnce(callback);
//
//                    // "onSpecChange" should have been called with no params
//                    expect(onSpecChange.firstCall.args).to.have.lengthOf(0);
//
//                    // "onSpecLoaded" should have been called with the Swagger object
//                    expect(onSpecLoaded.secondCall.args[0]).to.be.null();
//                    expect(onSpecLoaded.secondCall.args[1]).to.deep.equal(env.files.parsed.externalRefs);
//
//                    server.stop(done);
//                });
//            });
//
//            server.start(callback);
//        }
//    );
//
//
//    describe('Failure tests', function() {
//
//        beforeEach(function() {
//            // Suppress warning messages because they clutter up the unit test output
//            process.env.WARN = 'off';
//        });
//
//        afterEach(function() {
//            process.env.WARN = '';
//        });
//
//        it('should fire "specLoaded" event even when "start" fails',
//            function(done) {
//                var onSpecChange = sinon.spy();
//                var onSpecLoaded = sinon.spy();
//                var onStart = sinon.spy();
//
//                var server = new swagger.Server(env.files.blank);
//                server.on('specChange', onSpecChange);
//                server.on('specLoaded', onSpecLoaded);
//                server.on('start', onStart);
//
//                var callback = sinon.spy(function() {
//                    // Make sure the correct events were fired
//                    sinon.assert.calledOnce(onSpecLoaded);
//                    sinon.assert.notCalled(onStart);
//                    sinon.assert.notCalled(onSpecChange);
//
//                    // Make sure they were fired in the correct order
//                    sinon.assert.callOrder(onSpecLoaded, callback);
//
//                    // "onSpecLoaded" should have been called with a SyntaxError
//                    expect(onSpecLoaded.firstCall.args[0])
//                        .to.be.an.instanceOf(Error)
//                        .with.property('name', 'SyntaxError');
//                    expect(onSpecLoaded.firstCall.args[1]).to.be.undefined();
//
//                    // the callback should have been called with a wrapped Error
//                    expect(callback.firstCall.args[0])
//                        .to.be.an.instanceOf(Error)
//                        .with.property('message').match(/Swagger-Server cannot start due to the following error/);
//                    expect(callback.firstCall.args[1]).to.be.undefined();
//
//                    done();
//                });
//
//                server.start(callback);
//            }
//        );
//
//        it('should fire the same events when an HTTP error occurs',
//            function(done) {
//                var onSpecChange = sinon.spy();
//                var onSpecLoaded = sinon.spy();
//                var onStart = sinon.spy();
//
//                env.nock()
//                    .get('/404.yaml')
//                    .reply(404);
//
//                var server = new swagger.Server(env.urls.error404);
//                server.on('specChange', onSpecChange);
//                server.on('specLoaded', onSpecLoaded);
//                server.on('start', onStart);
//
//                var callback = sinon.spy(function() {
//                    // Make sure the correct events were fired
//                    sinon.assert.calledOnce(onSpecLoaded);
//                    sinon.assert.notCalled(onStart);
//                    sinon.assert.notCalled(onSpecChange);
//
//                    // Make sure they were fired in the correct order
//                    sinon.assert.callOrder(onSpecLoaded, callback);
//
//                    // "onSpecLoaded" should have been called with a SyntaxError
//                    expect(onSpecLoaded.firstCall.args[0])
//                        .to.be.an.instanceOf(Error)
//                        .with.property('message').match(/HTTP ERROR 404/);
//                    expect(onSpecLoaded.firstCall.args[1]).to.be.undefined();
//
//                    // the callback should have been called with a wrapped Error
//                    expect(callback.firstCall.args[0])
//                        .to.be.an.instanceOf(Error)
//                        .with.property('message').match(/Swagger-Server cannot start due to the following error/);
//                    expect(callback.firstCall.args[1]).to.be.undefined();
//
//                    done();
//                });
//
//                server.start(callback);
//            }
//        );
//
//        it('should fire the same events started via Express',
//            function(done) {
//                var onSpecChange = sinon.spy();
//                var onSpecLoaded = sinon.spy();
//                var onStart = sinon.spy();
//
//                var server = new swagger.Server(env.files.blank);
//                server.on('specChange', onSpecChange);
//                server.on('specLoaded', onSpecLoaded);
//                server.on('start', onStart);
//
//                var callback = sinon.spy(function(err) {
//                    // Make sure the correct events were fired
//                    sinon.assert.calledOnce(onSpecLoaded);
//                    sinon.assert.notCalled(onStart);
//                    sinon.assert.notCalled(onSpecChange);
//
//                    // Make sure they were fired in the correct order
//                    sinon.assert.callOrder(onSpecLoaded, callback);
//
//                    // "onSpecLoaded" should have been called with a SyntaxError
//                    expect(onSpecLoaded.firstCall.args[0])
//                        .to.be.an.instanceOf(Error)
//                        .with.property('name', 'SyntaxError');
//                    expect(onSpecLoaded.firstCall.args[1]).to.be.undefined();
//
//                    // the server should have returned a 500 error
//                    expect(callback.firstCall.args[0]).to.be.null();
//                    expect(callback.firstCall.args[1]).to.have.property('statusCode', 500);
//
//                    done();
//                });
//
//                // Run the server using Express rather than SwaggerServer.start()
//                env.supertest(server.middleware)
//                    .get('/foo')
//                    .expect(500)
//                    .end(callback);
//            }
//        );
//    });
});
