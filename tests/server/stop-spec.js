var swagger = require('../../');
var env = require('../test-environment');

describe('SwaggerServer.stop', function() {
    'use strict';

    it('should be aliased as "SwaggerServer.close"',
        function() {
            var server = new swagger.Server('foo');
            expect(server.stop).to.equal(server.close);
        }
    );

    it('should return the SwaggerServer instance',
        function(done) {
            var server = new swagger.Server('foo');
            server.start(function() {
                var returnVal = server.stop(done);
                expect(returnVal).to.equal(server);
            });
        }
    );

    it('can be called without any arguments',
        function(done) {
            var server = new swagger.Server(env.files.minimal);
            server.start(function() {
                server.stop();
                setTimeout(done, 25);   // normally we'd do this in the `stop()` callback
            });
        }
    );

    it('can be called with a callback',
        function(done) {
            var server = new swagger.Server(env.files.minimal);
            server.start(function() {
                server.stop(done);
            });
        }
    );

    it('should not pass any params to the callback before being started',
        function(done) {
            var server = new swagger.Server(env.files.minimal);
            server.stop(function() {
                expect(arguments).to.have.lengthOf(0);
                done();
            });
        }
    );

    it('should not pass any params to the callback after being started',
        function(done) {
            var server = new swagger.Server(env.files.minimal);
            server.start(function() {
                server.stop(function() {
                    expect(arguments).to.have.lengthOf(0);
                    done();
                });
            });
        }
    );

    it('calls the callback asynchronously before being started',
        function(done) {
            var counter;
            var server = new swagger.Server(env.files.minimal);

            // The callback should be called AFTER the counter is incremented
            counter = 0;
            server.stop(function() {
                expect(counter).to.equal(1);
                done();
            });
            counter = 1;
        }
    );

    it('calls the callback asynchronously after being started',
        function(done) {
            var counter;
            var server = new swagger.Server(env.files.minimal);
            server.start(function() {
                // The callback should be called AFTER the counter is incremented
                counter = 0;
                server.stop(function() {
                    expect(counter).to.equal(1);
                    done();
                });
                counter = 1;
            });
        }
    );

    it('can be called multiple times before the server has started',
        function(done) {
            var spy = sinon.spy();
            var server = new swagger.Server(env.files.minimal);

            server.stop();
            server.stop(spy);
            server.stop(function() {
                sinon.assert.calledOnce(spy);
                done();
            });
        }
    );

    it('can be called multiple times after the server has started',
        function(done) {
            var spy = sinon.spy();
            var server = new swagger.Server(env.files.minimal);
            server.start(function() {
                server.stop();
                server.stop(spy);
                server.stop(function() {
                    sinon.assert.calledOnce(spy);
                    done();
                });
            });
        }
    );

    it('cannot be started if it has been stopped',
        function(done) {
            var server = new swagger.Server(env.files.minimal);
            server.stop();
            server.start(function(err) {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.message).to.match(/Swagger-Server has been stopped/);
                done();
            });
        }
    );

    it('cannot be restarted after it has been stopped',
        function(done) {
            var server = new swagger.Server(env.files.minimal);
            server.start(function(err) {
                expect(err).to.be.null();

                server.stop();
                server.start(function(err) {
                    expect(err).to.be.an.instanceOf(Error);
                    expect(err.message).to.match(/Swagger-Server has been stopped/);
                    done();
                });
            });
        }
    );

    it('should reset SwaggerServer.state when called before start',
        function() {
            var server = new swagger.Server(env.files.minimal);
            var state = server.state;
            server.stop();

            // The state should be reset to match the prototype.state
            expect(server.state).to.deep.equal(swagger.Server.prototype.state);

            // ...but it should NOT be the same object as prototype.state
            expect(server.state).not.to.equal(swagger.Server.prototype.state);

            // ...and it should still be the same object reference as before
            // (this might be important if calling code has a cached reference to server.state)
            expect(server.state).to.equal(state);
        }
    );

    it('should reset SwaggerServer.state when called after start',
        function(done) {
            var server = new swagger.Server(env.files.minimal);
            var state = server.state;
            server.start(function() {
                server.stop(function() {
                    // The state should be reset to match the prototype.state
                    expect(server.state).to.deep.equal(swagger.Server.prototype.state);

                    // ...but it should NOT be the same object as prototype.state
                    expect(server.state).not.to.equal(swagger.Server.prototype.state);

                    // ...and it should still be the same object reference as before
                    // (this might be important if calling code has a cached reference to server.state)
                    expect(server.state).to.equal(state);

                    done();
                });
            });
        }
    );

    it('only stops the server it\'s called on',
        function(done) {
            var server1 = new swagger.Server(env.files.minimal);
            var server2 = new swagger.Server(env.files.externalRefs);

            server1.start(function(err, httpServer) {
                expect(err).to.be.null();
                bothStarted();
            });

            server2.start(function(err, httpServer) {
                expect(err).to.be.null();
                bothStarted();
            });

            function bothStarted() {
                if (server1.state.started && server2.state.started) {
                    server1.stop(function(err) {
                        expect(err).to.be.undefined();

                        // Server1 is stopped, but Server2 is still running
                        expect(server1.state.started).to.be.null();
                        expect(server2.state.started).not.to.be.null();

                        server2.stop(done);
                    });
                }
            }
        }
    );

    it('should be called automatically if the http.Server is closed',
        function(done) {
            var server = new swagger.Server(env.files.minimal);
            var stop = sinon.spy(server, 'stop');

            server.start(function(err, httpServer) {
                // Closing the HTTP server should call `stop()`
                httpServer.close(function() {
                    sinon.assert.calledOnce(stop);
                    stop.restore();
                    done();
                });
            });
        }
    );

    it('should stop watching files',
        function(done) {
            this.timeout(3500);
            var counter = 0;
            var server = new swagger.Server(env.files.externalRefs);

            server.start(function(err) {
                // Edit the file to trigger a "specChange" event
                env.touchFile(env.files.error);
            });

            server.on('specChange', function() {
                // Keep count of how many times the "specChange" event was fired
                counter++;
            });

            server.on('specLoaded', function() {
                if (counter === 1) {
                    // Edit the file again after the server has stopped.
                    // This should NOT trigger another "specChange" event
                    server.stop();
                    env.touchFile(env.files.error);

                    // Allow time for any file-change events to trigger.
                    setTimeout(function() {
                        // The counter should be still be 1,
                        // since the last `touchFile()` occurred after the server was stopped
                        expect(counter).to.equal(1);

                        done();
                    }, 2000);
                }
                else if (counter > 1) {
                    done(new Error('The "specLoaded" event continued triggering after the server was stopped'));
                }
            });
        }
    );

});
