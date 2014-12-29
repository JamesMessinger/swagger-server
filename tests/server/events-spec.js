var swagger = require('../../');
var express = require('express');
var request = require('supertest');
var http = require('http');
var env = require('../test-environment');

describe('SwaggerServer events', function() {
    'use strict';

    describe('Success tests', function() {
        it('should fire "specLoaded", and "start" event when started',
            function(done) {
                var onSpecChange = sinon.spy();
                var onSpecLoaded = sinon.spy();
                var onStart = sinon.spy();

                var server = new swagger.Server(env.files.minimal);
                server.on('specChange', onSpecChange);
                server.on('specLoaded', onSpecLoaded);
                server.on('start', onStart);

                var callback = sinon.spy(function() {
                    // Make sure the "specLoaded" and "start" events were fired
                    sinon.assert.calledOnce(onSpecLoaded);
                    sinon.assert.calledOnce(onStart);

                    // The "specChange" event should not have fired
                    sinon.assert.notCalled(onSpecChange);

                    // Make sure they were fired in the correct order
                    sinon.assert.callOrder(onSpecLoaded, onStart, callback);

                    // "onSpecLoaded" should have been called with the Swagger object
                    expect(onSpecLoaded.firstCall.args[0]).to.be.null;
                    expect(onSpecLoaded.firstCall.args[1])
                        .to.be.an('object')
                        .with.property('swagger', '2.0');

                    // "onStart" should have been called without any args
                    expect(onStart.firstCall.args).to.have.lengthOf(0);

                    // the callback should have been called with the Server object
                    expect(callback.firstCall.args[0]).to.be.null;
                    expect(callback.firstCall.args[1]).to.be.an.instanceOf(http.Server);

                    server.stop(done);
                });

                server.start(callback);
            }
        );

        it('should fire the same events when started with a URL',
            function(done) {
                var onSpecChange = sinon.spy();
                var onSpecLoaded = sinon.spy();
                var onStart = sinon.spy();

                env.nock.get('/minimal.yaml').replyWithFile(200, env.files.minimal);

                var server = new swagger.Server(env.urls.minimal);
                server.on('specChange', onSpecChange);
                server.on('specLoaded', onSpecLoaded);
                server.on('start', onStart);

                var callback = sinon.spy(function() {
                    // Make sure the "specLoaded" and "start" events were fired
                    sinon.assert.calledOnce(onSpecLoaded);
                    sinon.assert.calledOnce(onStart);

                    // The "specChange" event should not have fired
                    sinon.assert.notCalled(onSpecChange);

                    // Make sure they were fired in the correct order
                    sinon.assert.callOrder(onSpecLoaded, onStart, callback);

                    // "onSpecLoaded" should have been called with the Swagger object
                    expect(onSpecLoaded.firstCall.args[0]).to.be.null;
                    expect(onSpecLoaded.firstCall.args[1])
                        .to.be.an('object')
                        .with.property('swagger', '2.0');

                    // "onStart" should have been called without any args
                    expect(onStart.firstCall.args).to.have.lengthOf(0);

                    // the callback should have been called with the Server object
                    expect(callback.firstCall.args[0]).to.be.null;
                    expect(callback.firstCall.args[1]).to.be.an.instanceOf(http.Server);

                    server.stop(done);
                });

                server.start(callback);
            }
        );

        it('should fire the same events when started via Express',
            function(done) {
                var onSpecChange = sinon.spy();
                var onSpecLoaded = sinon.spy();
                var onStart = sinon.spy();

                var server = new swagger.Server(env.files.minimal);
                server.on('specChange', onSpecChange);
                server.on('specLoaded', onSpecLoaded);
                server.on('start', onStart);

                var callback = sinon.spy(function(err) {
                    if (err) return done(err);

                    // Make sure the "specLoaded" and "start" events were fired
                    sinon.assert.calledOnce(onSpecLoaded);
                    sinon.assert.calledOnce(onStart);

                    // The "specChange" event should not have fired
                    sinon.assert.notCalled(onSpecChange);

                    // Make sure they were fired in the correct order
                    sinon.assert.callOrder(onSpecLoaded, onStart, callback);

                    // "onSpecLoaded" should have been called with the Swagger object
                    expect(onSpecLoaded.firstCall.args[0]).to.be.null;
                    expect(onSpecLoaded.firstCall.args[1])
                        .to.be.an('object')
                        .with.property('swagger', '2.0');

                    // "onStart" should have been called without any args
                    expect(onStart.firstCall.args).to.have.lengthOf(0);

                    // the server should have returned a 404 error
                    expect(callback.firstCall.args[0]).to.be.null;
                    expect(callback.firstCall.args[1]).to.have.property('statusCode', 404);

                    server.stop(done);
                });

                // Run the server using Express rather than SwaggerServer.start()
                var expressServer = express();
                expressServer.use(server.middleware);
                request(expressServer)
                    .get('/foo')
                    .expect(404)
                    .end(callback);
            }
        );

        it('should fire "specChange" and "specLoaded" when the Swagger file is changed',
            function(done) {
                var onSpecChange = sinon.spy();
                var onSpecLoaded = sinon.spy();
                var onStart = sinon.spy();

                var server = new swagger.Server(env.files.minimal);
                server.on('specChange', onSpecChange);
                server.on('specLoaded', onSpecLoaded);
                server.on('start', onStart);

                var callback = sinon.spy(function(err) {
                    if (err) done(err);

                    // Edit the file to trigger a "specChange" event
                    env.modifyFile(env.files.minimal, function(err) {
                        if (err) done(err);
                    });

                    // This should be triggered when the file is edited
                    server.once('specLoaded', function() {
                        // The "specLoaded" event should have fired twice
                        sinon.assert.calledTwice(onSpecLoaded);

                        // But these events should only fire once
                        sinon.assert.calledOnce(onSpecChange);
                        sinon.assert.calledOnce(onStart);

                        // The callback should have only been called once
                        sinon.assert.calledOnce(callback);

                        // "onSpecChange" should have been called with no params
                        expect(onSpecChange.firstCall.args).to.have.lengthOf(0);

                        // "onSpecLoaded" should have been called with the Swagger object
                        expect(onSpecLoaded.secondCall.args[0]).to.be.null;
                        expect(onSpecLoaded.secondCall.args[1])
                            .to.be.an('object')
                            .with.property('swagger', '2.0');

                        server.stop(done);
                    });
                });

                server.start(callback);
            }
        );

        it('should fire "specChange" and "specLoaded" when a referenced file is changed',
            function(done) {
                var onSpecChange = sinon.spy();
                var onSpecLoaded = sinon.spy();
                var onStart = sinon.spy();

                var server = new swagger.Server(env.files.externalRefs);
                server.on('specChange', onSpecChange);
                server.on('specLoaded', onSpecLoaded);
                server.on('start', onStart);

                var callback = sinon.spy(function(err) {
                    if (err) done(err);

                    // Edit the file to trigger another "specChange" event
                    env.modifyFile(env.files.pet, function(err) {
                        if (err) done(err);
                    });

                    // This should be triggered when the file is edited
                    server.once('specLoaded', function() {
                        // The "specLoaded" event should have fired twice
                        sinon.assert.calledTwice(onSpecLoaded);

                        // But these events should only fire once
                        sinon.assert.calledOnce(onStart);
                        sinon.assert.calledOnce(onSpecChange);

                        // The callback should have only been called once
                        sinon.assert.calledOnce(callback);

                        // "onSpecChange" should have been called with no params
                        expect(onSpecChange.firstCall.args).to.have.lengthOf(0);

                        // "onSpecLoaded" should have been called with the Swagger object
                        expect(onSpecLoaded.secondCall.args[0]).to.be.null;
                        expect(onSpecLoaded.secondCall.args[1])
                            .to.be.an('object')
                            .with.property('swagger', '2.0');

                        server.stop(done);
                    });
                });

                server.start(callback);
            }
        );

    });


  describe('Failure tests', function() {
      it('should fire "specLoaded" event even when "start" fails',
          function(done) {
              var onSpecChange = sinon.spy();
              var onSpecLoaded = sinon.spy();
              var onStart = sinon.spy();

              var server = new swagger.Server(env.files.blank);
              server.on('specChange', onSpecChange);
              server.on('specLoaded', onSpecLoaded);
              server.on('start', onStart);

              var callback = sinon.spy(function() {
                  // Make sure the correct events were fired
                  sinon.assert.calledOnce(onSpecLoaded);
                  sinon.assert.notCalled(onStart);
                  sinon.assert.notCalled(onSpecChange);

                  // Make sure they were fired in the correct order
                  sinon.assert.callOrder(onSpecLoaded, callback);

                  // "onSpecLoaded" should have been called with a SyntaxError
                  expect(onSpecLoaded.firstCall.args[0])
                      .to.be.an.instanceOf(Error)
                      .with.property('name', 'SyntaxError');
                  expect(onSpecLoaded.firstCall.args[1]).to.be.undefined;

                  // the callback should have been called with a wrapped Error
                  expect(callback.firstCall.args[0])
                      .to.be.an.instanceOf(Error)
                      .with.property('message').match(/Swagger-Server cannot start due to the following error/);
                  expect(callback.firstCall.args[1]).to.be.undefined;

                  done();
              });

              server.start(callback);
          }
      );

      it('should fire the same events when an HTTP error occurs',
          function(done) {
              var onSpecChange = sinon.spy();
              var onSpecLoaded = sinon.spy();
              var onStart = sinon.spy();

              env.nock.get('/404.yaml').reply(404);

              var server = new swagger.Server(env.urls.error404);
              server.on('specChange', onSpecChange);
              server.on('specLoaded', onSpecLoaded);
              server.on('start', onStart);

              var callback = sinon.spy(function() {
                  // Make sure the correct events were fired
                  sinon.assert.calledOnce(onSpecLoaded);
                  sinon.assert.notCalled(onStart);
                  sinon.assert.notCalled(onSpecChange);

                  // Make sure they were fired in the correct order
                  sinon.assert.callOrder(onSpecLoaded, callback);

                  // "onSpecLoaded" should have been called with a SyntaxError
                  expect(onSpecLoaded.firstCall.args[0])
                      .to.be.an.instanceOf(Error)
                      .with.property('message').match(/HTTP ERROR 404/);
                  expect(onSpecLoaded.firstCall.args[1]).to.be.undefined;

                  // the callback should have been called with a wrapped Error
                  expect(callback.firstCall.args[0])
                      .to.be.an.instanceOf(Error)
                      .with.property('message').match(/Swagger-Server cannot start due to the following error/);
                  expect(callback.firstCall.args[1]).to.be.undefined;

                  done();
              });

              server.start(callback);
          }
      );

      it('should fire the same events started via Express',
          function(done) {
              var onSpecChange = sinon.spy();
              var onSpecLoaded = sinon.spy();
              var onStart = sinon.spy();

              var server = new swagger.Server(env.files.blank);
              server.on('specChange', onSpecChange);
              server.on('specLoaded', onSpecLoaded);
              server.on('start', onStart);

              var callback = sinon.spy(function(err) {
                  // Make sure the correct events were fired
                  sinon.assert.calledOnce(onSpecLoaded);
                  sinon.assert.notCalled(onStart);
                  sinon.assert.notCalled(onSpecChange);

                  // Make sure they were fired in the correct order
                  sinon.assert.callOrder(onSpecLoaded, callback);

                  // "onSpecLoaded" should have been called with a SyntaxError
                  expect(onSpecLoaded.firstCall.args[0])
                      .to.be.an.instanceOf(Error)
                      .with.property('name', 'SyntaxError');
                  expect(onSpecLoaded.firstCall.args[1]).to.be.undefined;

                  // the server should have returned a 500 error
                  expect(callback.firstCall.args[0]).to.be.null;
                  expect(callback.firstCall.args[1]).to.have.property('statusCode', 500);

                  done();
              });

              // Run the server using Express rather than SwaggerServer.start()
              var expressServer = express();
              expressServer.set('env', 'test');
              expressServer.use(server.middleware);
              request(expressServer)
                  .get('/foo')
                  .expect(500)
                  .end(callback);
          }
      );
  });
});
