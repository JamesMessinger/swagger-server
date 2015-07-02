'use strict';

var env = require('../test-environment');
var test_passed = 599, test_failed = 500;

describe('App middleware', function() {
  it('should send an error downstream if the API is invalid',
    function(done) {
      env.disableWarningsForThisTest();

      var server = env.swaggerServer(env.files.blank);
      var app = server.app;
      server.on('parsed', function() {
        var supertest = env.supertest(app);

        // Doesn't really matter what we browse to here, since the API is invalid
        supertest.post('/pets').expect(test_passed, done);

        // Should NOT get called
        app.use(function(req, res, next) {
          res.status(test_failed)
            .send('Success middleware was called. Only Error middleware should have been called');
        });

        // Should get called
        app.use(function(err, req, res, next) {
          expect(err).to.be.an.instanceOf(SyntaxError);
          expect(err.message).to.contain('Error parsing file');

          res.sendStatus(test_passed);
        });
      });
    }
  );

  describe('X-Powered-By', function() {
    it('should set the X-Powered-By HTTP header on a successful response',
      function(done) {
        var server = env.swaggerServer(env.files.testResponses);
        var app = server.app;
        server.on('parsed', function() {
          var supertest = env.supertest(app);
          supertest
            .get('/test/200')
            .expect(200)
            .expect('x-powered-by', 'Swagger Server', done);
        });
      }
    );

    it('should set the X-Powered-By HTTP header on an error response (within the API\'s basePath)',
      function(done) {
        var server = env.swaggerServer(env.files.testResponses);
        var app = server.app;
        server.on('parsed', function() {
          var supertest = env.supertest(app);

          supertest
            .get('/test/507')
            .expect(507)
            .expect('x-powered-by', 'Swagger Server', done);
        });
      }
    );

    it('should set the X-Powered-By HTTP header on an error response (outside the API\'s basePath',
      function(done) {
        var server = env.swaggerServer(env.files.testResponses);
        var app = server.app;
        server.on('parsed', function() {
          var supertest = env.supertest(app);
          supertest
            .get('/404')    // Missing "/test"
            .expect(404)
            .expect('x-powered-by', 'Swagger Server', done);
        });
      }
    );

    it('should not set the X-Powered-By HTTP header if "x-powered-by" is disabled',
      function(done) {
        var server = env.swaggerServer(env.files.testResponses);
        var app = server.app;
        server.on('parsed', function() {
          app.disable('x-powered-by');

          var supertest = env.supertest(app);
          supertest
            .get('/test/200')
            .expect(200)
            .expect(function(res) { return res.get('x-powered-by'); })
            .end(done);
        });
      }
    );
  })
});
