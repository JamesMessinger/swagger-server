describe('"change" event', function() {
    'use strict';

    var env = require('../test-environment');
    beforeEach(env.beforeEach);
    afterEach(env.afterEach);

    it('should not fire unless a file is changed',
        function(done) {
            var onChange = sinon.spy();

            var server = env.swaggerServer(env.files.externalRefs);
            server.on('change', onChange);

            server.start(function() {
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
            var server = env.swaggerServer(env.files.minimal);
            server.on('change', onChange);

            server.start(function() {
                sinon.assert.notCalled(onChange);

                // Touch the main Swagger file, to trigger a "change" event
                env.touchFile(env.files.minimal);

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
            var server = env.swaggerServer(env.files.externalRefs);
            server.on('change', onChange);

            server.start(function() {
                sinon.assert.notCalled(onChange);

                // Touch the main Swagger file, to trigger a "change" event
                env.touchFile(env.files.externalRefs);

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

    it('should only fire multiple times when multiple file changes occur rapidly',
        function(done) {
            var onChange = sinon.spy();
            var server = env.swaggerServer(env.files.externalRefs);
            server.on('change', onChange);

            server.start(function() {
                // Wait for the file-watchers to start watching the files
                setTimeout(function() {
                    // Touch all of the files
                    env.touchFile(env.files.externalRefs, env.files.pet, env.files.error);

                    // Wait a sec for all the file-watchers to trigger
                    setTimeout(function() {
                        sinon.assert.calledThrice(onChange);
                        expect(onChange.firstCall.args[0]).to.equal(env.files.externalRefs);
                        expect(onChange.secondCall.args[0]).to.equal(env.files.pet);
                        expect(onChange.thirdCall.args[0]).to.equal(env.files.error);

                        done();
                    }, 500);
                }, 500);
            });
        }
    );

    it('should not fire if "watch files" is disabled',
        function(done) {
            var onChange = sinon.spy();
            var server = env.swaggerServer(env.files.externalRefs);
            server.on('change', onChange);
            server.disable('watch files');

            server.start(function() {
                // Wait for the file-watchers to start watching the files
                setTimeout(function() {
                    // Touch all of the files
                    env.touchFile(env.files.externalRefs, env.files.pet, env.files.error);

                    // Wait a sec for all the file-watchers to trigger
                    setTimeout(function() {
                        sinon.assert.notCalled(onChange);
                        done();
                    }, 500);
                }, 500);
            });
        }
    );
});
