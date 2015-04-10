'use strict';

var env = require('../test-environment');

describe('change event', function() {
    it('should not fire unless a file is changed',
        function(done) {
            var onChange = sinon.spy();

            var server = env.swaggerServer(env.files.petStoreExternalRefs);
            server.on('change', onChange);

            server.app.listen(function() {
                // Wait a bit to allow the file-watchers to start watching
                setTimeout(function() {
                    // The "change" event should NOT have fired
                    sinon.assert.notCalled(onChange);
                    done();
                }, 500);
            });
        }
    );

    it('should fire when the main Swagger file is changed',
        function(done) {
            var onChange = sinon.spy();
            var server = env.swaggerServer(env.files.petStore);
            server.on('change', onChange);

            server.app.listen(function() {
                sinon.assert.notCalled(onChange);

                // Touch the main Swagger file, to trigger a "change" event
                env.touchFile(env.files.petStore);

                server.once('parsed', function() {
                    sinon.assert.calledOnce(onChange);
                    done();
                });
            });
        }
    );

    it('should fire when any Swagger file is changed',
        function(done) {
            var onChange = sinon.spy();
            var server = env.swaggerServer(env.files.petStoreExternalRefs);
            server.on('change', onChange);

            server.app.listen(function() {
                sinon.assert.notCalled(onChange);

                // Touch the main Swagger file, to trigger a "change" event
                env.touchFile(env.files.petStoreExternalRefs);

                server.once('parsed', function() {
                    sinon.assert.calledOnce(onChange);

                    // Touch a referenced Swagger file, to trigger another "change" event
                    env.touchFile(env.files.pet);

                    server.once('parsed', function() {
                        sinon.assert.calledTwice(onChange);
                        done();
                    })
                });
            });
        }
    );

    it('should fire multiple times when multiple file changes occur rapidly',
        function(done) {
            var onChange = sinon.spy();
            var server = env.swaggerServer(env.files.petStoreExternalRefs);
            server.on('change', onChange);

            server.app.listen(function() {
                // Wait for the file-watchers to start watching the files
                setTimeout(function() {
                    // Touch all of the files
                    env.touchFile(env.files.petStoreExternalRefs, env.files.pet, env.files.error);

                    server.once('parsed', function() {
                        sinon.assert.calledThrice(onChange);
                        sinon.assert.calledWithExactly(onChange, 'change', env.files.petStoreExternalRefs);
                        sinon.assert.calledWithExactly(onChange, 'change', env.files.pet);
                        sinon.assert.calledWithExactly(onChange, 'change', env.files.error);

                        done();
                    });
                }, 500);
            });
        }
    );

    it('should only fire for one Swagger Server instance',
        function(done) {
            var server1 = env.swaggerServer(env.files.petStore);
            var server2 = env.swaggerServer(env.files.petStoreExternalRefs);

            var onChange1 = sinon.spy(), onChange2 = sinon.spy();
            server1.on('change', onChange1);
            server2.on('change', onChange2);

            var onListening = sinon.spy();
            server1.app.listen(onListening);

            server2.app.listen(function() {
                // Wait for the file-watchers to start watching the files
                setTimeout(function() {
                    // Make sure server1 is also listening
                    sinon.assert.calledOnce(onListening);

                    // Touch all of the files
                    env.touchFile(env.files.petStoreExternalRefs, env.files.pet, env.files.error);

                    server2.once('parsed', function() {
                        sinon.assert.notCalled(onChange1);
                        sinon.assert.calledThrice(onChange2);
                        sinon.assert.calledWithExactly(onChange2, 'change', env.files.petStoreExternalRefs);
                        sinon.assert.calledWithExactly(onChange2, 'change', env.files.pet);
                        sinon.assert.calledWithExactly(onChange2, 'change', env.files.error);

                        done();
                    });
                }, 500);
            });
        }
    );

    it('should not fire if "watch files" is disabled',
        function(done) {
            var onChange = sinon.spy();
            var server = env.swaggerServer(env.files.petStoreExternalRefs);
            server.on('change', onChange);
            server.app.disable('watch files');

            server.app.listen(function() {
                // Wait for the file-watchers to start watching the files
                setTimeout(function() {
                    // Touch all of the files
                    env.touchFile(env.files.petStoreExternalRefs, env.files.pet, env.files.error);

                    setTimeout(function() {
                        sinon.assert.notCalled(onChange);
                        done();
                    }, 1500);
                }, 500);
            });
        }
    );
});
