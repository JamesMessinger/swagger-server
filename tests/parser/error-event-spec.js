'use strict';

var env = require('../test-environment');

describe('error event', function() {
  beforeEach(env.disableWarningsForThisTest);

  it('should not fire on a successful start',
    function(done) {
      var onError = sinon.spy();
      var server = env.swaggerServer(env.files.petStoreExternalRefs);
      server.on('error', onError);

      server.app.listen(function() {
        sinon.assert.notCalled(onError);
        done();
      });
    }
  );

  it('should not fire when files change',
    function(done) {
      var onError = sinon.spy();
      var server = env.swaggerServer(env.files.petStoreExternalRefs);
      server.on('error', onError);

      server.app.listen(function() {
        sinon.assert.notCalled(onError);

        // Touch the main Swagger file, to trigger a "change" event
        env.touchFile(env.files.petStoreExternalRefs);

        server.once('parsed', function() {
          // Touch a referenced Swagger file, to trigger another "change" event
          env.touchFile(env.files.pet);

          server.once('parsed', function() {
            sinon.assert.notCalled(onError);
            done();
          })
        });
      });
    }
  );

  it('should fire when a parsing error occurs',
    function(done) {
      var onError = sinon.spy();
      var server = env.swaggerServer(env.files.blank);
      server.on('error', onError);

      server.app.listen(function() {
        sinon.assert.calledOnce(onError);
        expect(onError.firstCall.args[0]).to.be.an.instanceOf(SyntaxError);
        done();
      });
    }
  );

  it('should fire when an HTTP error occurs',
    function(done) {
      env.nock().get('/404.yaml').reply(404);

      var onError = sinon.spy();
      var server = env.swaggerServer(env.urls.error404);
      server.on('error', onError);

      server.app.listen(function() {
        sinon.assert.calledOnce(onError);
        expect(onError.firstCall.args[0]).to.be.an.instanceOf(Error);
        expect(onError.firstCall.args[0].message).to.match(/404/);
        done();
      });
    }
  );

  it('should bubble-up errors from the Express app',
    function() {
      var onError = sinon.spy();
      var server = env.swaggerServer(env.files.petStore);
      server.on('error', onError);
      server.app.emit('error', new Error('test error'));

      sinon.assert.calledOnce(onError);
      expect(onError.firstCall.args[0]).to.be.an.instanceOf(Error).with.property('message', 'test error');
    }
  );

  it('should not fire again if an error is resolved',
    function(done) {
      // Create a copy of "blank.yaml", so we can safely modify it
      env.copyFile(env.files.blank, env.files.temp);

      var onError = sinon.spy();
      var server = env.swaggerServer(env.files.temp);
      server.on('error', onError);

      server.app.listen(function() {
        sinon.assert.calledOnce(onError);
        expect(onError.firstCall.args[0]).to.be.an.instanceOf(SyntaxError);

        // The parse failed, but the server is still running and watching the file for changes.
        // So change it to be valid, and the parse should succeed.
        env.copyFile(env.files.petStore, env.files.temp);
        env.touchFile(env.files.temp);

        server.once('parsed', function() {
          // The "error" event should NOT have fired again
          sinon.assert.calledOnce(onError);
          done();
        })
      });
    }
  );

  it('should NOT fire when a file-watcher error occurs',
    function(done) {
      var onError = sinon.spy();
      var server = env.swaggerServer(env.files.petStore);
      server.on('error', onError);

      server.app.listen(function() {
        sinon.assert.notCalled(onError);

        // Simulate a file-watcher "error" event
        server.__watcher.watchedSwaggerFiles[0].emit('error', new Error('fake error'));

        sinon.assert.notCalled(onError);
        done();
      });
    }
  );

});
