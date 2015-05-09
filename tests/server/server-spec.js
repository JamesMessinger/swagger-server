'use strict';

var env     = require('../test-environment'),
    swagger = require('../../'),
    express = require('express');

describe('Server class', function() {
    it('should work with the "new" operator',
        function() {
            var server = new swagger.Server();
            expect(server).to.be.an.instanceOf(swagger.Server);
            currentTest.servers.push(server);
        }
    );

    it('should not work without the "new" operator',
        function() {
            var server = swagger.Server();
            expect(server).to.be.undefined;
            currentTest.servers.push(swagger.app);
        }
    );

    it('should create a new Express Application if called without any params',
        function() {
            var server = new swagger.Server();
            expect(server.app).to.be.a('function');
            expect(Object.keys(server.app)).to.include.all.members(Object.keys(express.application));
        }
    );

    it('should use the given Express Application',
        function() {
            var app = express();
            var server = new swagger.Server(app);
            expect(server.app).to.equal(app);
            expect(server.app).to.be.a('function');
            expect(Object.keys(server.app)).to.include.all.members(Object.keys(express.application));
        }
    );

    describe('Server.parse method', function() {
        it('should parse the given file',
            function(done) {
                var server = env.swaggerServer();
                server.parse(env.files.petStore);
                server.on('parsed', function(err, api) {
                    if (err) return done(err);
                    expect(api).to.deep.equal(env.files.parsed.petStore);
                    done();
                });
            }
        );

        it('should parse the given file, and call the callback function',
            function(done) {
                var server = env.swaggerServer();
                server.parse(env.files.petStore, function(err, api) {
                    if (err) return done(err);
                    expect(api).to.deep.equal(env.files.parsed.petStore);
                    done();
                });
            }
        );

        it('should only call the callback once',
            function(done) {
                var server = env.swaggerServer();
                var callback = sinon.spy();
                server.parse(env.files.petStore, callback);
                var onParsed = sinon.spy();
                server.on('parsed', onParsed);

                server.once('parsed', function() {
                    // The callback and event handler should both be called once
                    sinon.assert.calledOnce(callback);
                    sinon.assert.calledOnce(onParsed);

                    // Touch the file, to trigger a re-parse
                    env.touchFile(env.files.petStore);

                    server.once('parsed', function(err) {
                        if (err) return done(err);

                        // The callback IS NOT called again
                        sinon.assert.calledOnce(callback);

                        // The event handler IS called again
                        sinon.assert.calledTwice(onParsed);

                        done();
                    });
                });
            }
        );
    });
});
