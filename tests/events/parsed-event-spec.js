describe('"parsed" event', function() {
    'use strict';

    var env = require('../test-environment');
    beforeEach(env.beforeEach);
    afterEach(env.afterEach);

    it('should fire when created with a local file',
        function(done) {
            var server = env.swaggerServer(env.files.externalRefs);
            server.on('parsed', function(api, metadata) {
                expect(api).to.deep.equal(env.files.parsed.externalRefs);
                expect(metadata).to.deep.equal(env.files.metadata.externalRefs);
                done();
            });
        }
    );

    it('should fire when created with a URL',
        function(done) {
            env.nock()
                .get('/external-refs.yaml').replyWithFile(200, env.files.externalRefs)
                .get('/pet.yaml').replyWithFile(200, env.files.pet)
                .get('/error.yaml').replyWithFile(200, env.files.error);

            var server = env.swaggerServer(env.urls.externalRefs);
            server.on('parsed', function(api, metadata) {
                expect(api).to.deep.equal(env.files.parsed.externalRefs);
                expect(metadata).to.deep.equal(env.urls.metadata.externalRefs);
                done();
            });
        }
    );

    it('should only fire once for multiple requests',
        function(done) {
            var onParsed = sinon.spy();

            // Instantiate the server.
            // This will trigger once it's done parsing the file
            var server = env.swaggerServer(env.files.externalRefs);
            server.on('parsed', onParsed);

            // Start the server.
            // This should NOT trigger the "parsed' event.
            var httpServer = server.listen(function() {
                sinon.assert.calledOnce(onParsed);
                var supertest = env.supertest(httpServer);

                // Make a request.
                // This should NOT trigger the "parsed' event.
                supertest
                    .get('/foo')
                    .expect(404)
                    .end(function(err) {
                        if (err) return done(err);

                        // Make a second request.
                        // This should NOT trigger the "parsed' event
                        supertest
                            .get('/bar')
                            .expect(404)
                            .end(function(err) {
                                if (err) return done(err);

                                // Stop the server.
                                // This should NOT trigger a "parsed" event
                                server.close(function() {
                                    sinon.assert.calledOnce(onParsed);
                                    done();
                                });
                            })
                    });
            });
        }
    );

    it('should only fire once for multiple requests when mounted in a parent app',
        function(done) {
            var onParsed = sinon.spy();

            // Instantiate the server.
            // This will trigger once it's done parsing the file
            var server = env.swaggerServer(env.files.externalRefs);
            server.on('parsed', onParsed);

            // Mount the server in an Express app
            // This should NOT trigger the "parsed' event
            var express = env.express(server);
            var supertest = env.supertest(express);
            sinon.assert.notCalled(onParsed);

            // Make a request.
            // This should NOT trigger the "parsed' event.
            supertest
                .get('/foo')
                .expect(404)
                .end(function(err) {
                    if (err) return done(err);
                    sinon.assert.calledOnce(onParsed);

                    // Make a second request.
                    // This should NOT trigger the "parsed' event
                    supertest
                        .get('/bar')
                        .expect(404)
                        .end(function(err) {
                            if (err) return done(err);

                            // Stop the server.
                            // This should NOT trigger a "parsed" event
                            server.close(function() {
                                sinon.assert.calledOnce(onParsed);
                                done();
                            });
                        })
                });
        }
    );

    it('should fire again when the Swagger file is changed',
        function(done) {
            var onParsed = sinon.spy();
            var server = env.swaggerServer(env.files.minimal);
            server.on('parsed', onParsed);

            server.start(function(err) {
                if (err) return done(err);
                sinon.assert.calledOnce(onParsed);

                // Touch the main Swagger file, to trigger a re-parse
                env.touchFile(env.files.minimal);

                server.once('parsed', function() {
                    sinon.assert.calledTwice(onParsed);
                    sinon.assert.alwaysCalledWith(onParsed, env.files.parsed.minimal, env.files.metadata.minimal);
                    done();
                });
            });
        }
    );

    it('should fire again when any Swagger file is changed',
        function(done) {
            var onParsed = sinon.spy();
            var server = env.swaggerServer(env.files.externalRefs);
            server.on('parsed', onParsed);

            server.start(function(err) {
                if (err) return done(err);
                sinon.assert.calledOnce(onParsed);

                // Touch the main Swagger file, to trigger a re-parse
                env.touchFile(env.files.externalRefs);

                server.once('parsed', function() {
                    if (err) return done(err);
                    sinon.assert.calledTwice(onParsed);

                    // Touch a referenced Swagger file, to trigger another re-parse
                    env.touchFile(env.files.pet);

                    server.once('parsed', function() {
                        sinon.assert.calledThrice(onParsed);
                        sinon.assert.alwaysCalledWith(onParsed, env.files.parsed.externalRefs, env.files.metadata.externalRefs);
                        done();
                    })
                });
            });
        }
    );

    it('should only fire once when multiple file changes occur rapidly',
        function(done) {
            var onParsed = sinon.spy();

            var server = env.swaggerServer(env.files.externalRefs);

            server.start(function() {
                // Wait for the file-watchers to start watching the files
                setTimeout(function() {
                    // Touch all of the files. This should only trigger one re-parse
                    env.touchFile(env.files.externalRefs, env.files.pet, env.files.error);
                    server.on('parsed', onParsed);

                    // Wait a sec for all the file-watchers to trigger
                    setTimeout(function() {
                        sinon.assert.calledOnce(onParsed);
                        sinon.assert.alwaysCalledWith(onParsed, env.files.parsed.externalRefs, env.files.metadata.externalRefs);
                        done();
                    }, 500);
                }, 500);
            });
        }
    );

    describe('Failure tests', function() {
        beforeEach(env.disableWarnings);
        afterEach(env.enableWarnings);

        it('should fire even if a parsing error occurs',
            function(done) {
                var server = env.swaggerServer(env.files.blank);
                server.start();

                server.on('parsed', function(api, metadata) {
                    expect(api).to.be.null();
                    expect(metadata).to.be.an('object');
                    done();
                });
            }
        );

        it('should fire even if an HTTP error occurs',
            function(done) {
                env.nock().get('/404.yaml').reply(404);

                var server = env.swaggerServer(env.urls.error404);
                server.start();

                server.on('parsed', function(api, metadata) {
                    expect(api).to.be.null();
                    expect(metadata).to.be.an('object');
                    done();
                });
            }
        );

        it('should fire again if an error is resolved',
            function(done) {
                // Create a copy of "blank.yaml", so we can safely modify it
                env.copyFile(env.files.blank, env.files.temp);

                var server = env.swaggerServer(env.files.temp);
                server.start();

                server.once('parsed', function(api, metadata) {
                    expect(api).to.be.null();
                    expect(metadata).to.be.an('object');

                    // The parse failed, but the server is still running and watching the file for changes.
                    // So change it to be valid, and the parse should succeed.
                    env.copyFile(env.files.minimal, env.files.temp);
                    env.touchFile(env.files.temp);

                    server.once('parsed', function(api, metadata) {
                        expect(api).to.deep.equal(env.files.parsed.minimal);
                        expect(metadata).to.be.an('object');
                        done();
                    })
                });
            }
        );

    });
});
