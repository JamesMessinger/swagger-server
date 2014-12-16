describe('SwaggerServer events', function() {
  'use strict';

  it('should fire "specChange" and "specLoaded" event when "start" fails',
    function(done) {
      var onSpecChange = sinon.spy();
      var onSpecLoaded = sinon.spy();
      var onStart = sinon.spy();

      var server = env.createServer(env.files.blank);
      server.on('specChange', onSpecChange);
      server.on('specLoaded', onSpecLoaded);
      server.on('start', onStart);

      var callback = sinon.spy(function() {
        // Make sure the correct events were fired
        sinon.assert.calledOnce(onSpecChange);
        sinon.assert.calledOnce(onSpecLoaded);
        sinon.assert.notCalled(onStart);

        // Make sure they were fired in the correct order
        sinon.assert.callOrder(onSpecChange, onSpecLoaded, callback);

        // "onSpecChange" should have been called with no params
        expect(onSpecChange.firstCall.args).to.have.lengthOf(0);

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

      var server = env.createServer(env.urls.error404);
      server.on('specChange', onSpecChange);
      server.on('specLoaded', onSpecLoaded);
      server.on('start', onStart);

      var callback = sinon.spy(function() {
        // Make sure the correct events were fired
        sinon.assert.calledOnce(onSpecChange);
        sinon.assert.calledOnce(onSpecLoaded);
        sinon.assert.notCalled(onStart);

        // Make sure they were fired in the correct order
        sinon.assert.callOrder(onSpecChange, onSpecLoaded, callback);

        // "onSpecChange" should have been called with no params
        expect(onSpecChange.firstCall.args).to.have.lengthOf(0);

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

  it('should fire "specChange", "specLoaded", and "start" event when "start" succeeds',
    function(done) {
      var onSpecChange = sinon.spy();
      var onSpecLoaded = sinon.spy();
      var onStart = sinon.spy();

      var server = env.createServer(env.files.minimal);
      server.on('specChange', onSpecChange);
      server.on('specLoaded', onSpecLoaded);
      server.on('start', onStart);

      var callback = sinon.spy(function(err, http) {
        // Make sure all three events were fired
        sinon.assert.calledOnce(onSpecChange);
        sinon.assert.calledOnce(onSpecLoaded);
        sinon.assert.calledOnce(onStart);

        // Make sure they were fired in the correct order
        sinon.assert.callOrder(onSpecChange, onSpecLoaded, onStart, callback);

        // "onSpecChange" should have been called with no params
        expect(onSpecChange.firstCall.args).to.have.lengthOf(0);

        // "onSpecLoaded" should have been called with the Swagger object
        expect(onSpecLoaded.firstCall.args[0]).to.be.null;
        expect(onSpecLoaded.firstCall.args[1])
          .to.be.an('object')
          .with.property('swagger', '2.0');

        // the callback should have been called with the Server object
        expect(callback.firstCall.args[0]).to.be.null;

        http.close(done);
      });

      server.start(callback);
    }
  );

  it('should fire the same events when "swaggerFile" is a URL',
    function(done) {
      var onSpecChange = sinon.spy();
      var onSpecLoaded = sinon.spy();
      var onStart = sinon.spy();

      env.nock.get('/minimal.yaml').replyWithFile(200, env.files.minimal);

      var server = env.createServer(env.urls.minimal);
      server.on('specChange', onSpecChange);
      server.on('specLoaded', onSpecLoaded);
      server.on('start', onStart);

      var callback = sinon.spy(function(err, http) {
        // Make sure all three events were fired
        sinon.assert.calledOnce(onSpecChange);
        sinon.assert.calledOnce(onSpecLoaded);
        sinon.assert.calledOnce(onStart);

        // Make sure they were fired in the correct order
        sinon.assert.callOrder(onSpecChange, onSpecLoaded, onStart, callback);

        // "onSpecChange" should have been called with no params
        expect(onSpecChange.firstCall.args).to.have.lengthOf(0);

        // "onSpecLoaded" should have been called with the Swagger object
        expect(onSpecLoaded.firstCall.args[0]).to.be.null;
        expect(onSpecLoaded.firstCall.args[1])
          .to.be.an('object')
          .with.property('swagger', '2.0');

        // the callback should have been called with the Server object
        expect(callback.firstCall.args[0]).to.be.null;

        http.close(done);
      });

      server.start(callback);
    }
  );

  it('should fire "specChange" and "specLoaded" again when the Swagger file is changed',
    function(done) {
      var onSpecChange = sinon.spy();
      var onSpecLoaded = sinon.spy();
      var onStart = sinon.spy();

      var server = env.createServer(env.files.minimal);
      server.on('specChange', onSpecChange);
      server.on('specLoaded', onSpecLoaded);
      server.on('start', onStart);

      var callback = sinon.spy(function(err, http) {
        // Edit the file to trigger another "specChange" event
        env.modifyFile(env.files.minimal, function(err) {
          if (err) done(err);
        });

        // This should be triggered when the file is edited
        server.once('specLoaded', function() {
          // These events should have fired twice
          sinon.assert.calledTwice(onSpecChange);
          sinon.assert.calledTwice(onSpecLoaded);

          // But the "start" event should only fire once
          sinon.assert.calledOnce(onStart);

          // The callback should have only been called once
          sinon.assert.calledOnce(callback);

          // "onSpecChange" should have been called with no params
          expect(onSpecChange.secondCall.args).to.have.lengthOf(0);

          // "onSpecLoaded" should have been called with the Swagger object
          expect(onSpecLoaded.secondCall.args[0]).to.be.null;
          expect(onSpecLoaded.secondCall.args[1])
            .to.be.an('object')
            .with.property('swagger', '2.0');

          http.close(done);
        });
      });

      server.start(callback);
    }
  );


  // TODO: specChange, specLoaded called when started via Express (error)
  // TODO: specChange, specLoaded, start called when started via Express (success)

});
