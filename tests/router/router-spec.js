'use strict';

var env     = require('../test-environment'),
    swagger = require('../../');
var test_passed = 599, test_failed = 500;

describe('Router', function() {
  it('should support Express-style paths',
    function(done) {
      var server = env.swaggerServer(env.files.petStore);
      var app = server.app;
      var router = swagger.Router();
      var supertest = env.supertest(app);
      var counter = 0;

      server.on('parsed', function() {
        supertest.get('/api/pets/fido').expect(test_passed, done);

        app.use('/api/pets', router);

        // None of these should be called
        app.post('/api/pets/fido', error);
        router.post('/fido', error);

        app.delete('/api/pets/:name', error);
        router.delete('/:name', error);

        app.get('/api/pets/spot', error);
        router.get('/spot', error);

        app.route('/api/pets/:name/')
          .put(error)
          .options(error)
          .post(error);
        router.route('/:name/')
          .put(error)
          .options(error)
          .post(error);

        // All of these should be called
        app.get('/api/pets/fido', handler);
        router.get('/fido', handler);

        app.get('/:api/:pets/:name', handler);
        router.get('/:name', handler);

        app.all('/api/pets/fido/', handler);
        router.all('/fido/', handler);

        app.use('/api/pets/:name', handler);
        router.use('/:name', handler);

        app.route('/api/pets/:name/')
          .get(handler)
          .all(handler);
        router.route('/:name/')
          .get(handler)
          .all(handler);

        function handler(req, res, next) {
          expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);
          expect(req.swagger.path).to.deep.equal(env.files.parsed.petPath);
          expect(req.swagger.operation).to.deep.equal(env.files.parsed.petGetOperation);

          ++counter === 12 ? res.sendStatus(test_passed) : next();
        }

        function error(req, res, next) {
          counter = -999;
          res.sendStatus(test_failed);
        }
      });
    }
  );

  it('should support Swagger-style paths',
    function(done) {
      var server = env.swaggerServer(env.files.petStore);
      var app = server.app;
      var router = swagger.Router();
      var supertest = env.supertest(app);
      var counter = 0;

      server.on('parsed', function() {
        supertest.get('/api/pets/fido').expect(test_passed, done);

        app.use('/api/pets', router);

        // None of these should be called
        app.post('/api/pets/fido', error);
        router.post('/fido', error);

        app.delete('/api/pets/{name}', error);
        router.delete('/{name}', error);

        app.get('/api/pets/spot', error);
        router.get('/spot', error);

        app.route('/api/pets/{name}/')
          .put(error)
          .options(error)
          .post(error);
        router.route('/{name}/')
          .put(error)
          .options(error)
          .post(error);

        // All of these should be called
        app.get('/api/pets/fido', handler);
        router.get('/fido', handler);

        app.get('/:api/:pets/{name}', handler);
        router.get('/{name}', handler);

        app.all('/api/pets/fido/', handler);
        router.all('/fido/', handler);

        app.use('/api/pets/{name}', handler);
        router.use('/{name}', handler);

        app.route('/api/pets/{name}/')
          .get(handler)
          .all(handler);
        router.route('/{name}/')
          .get(handler)
          .all(handler);

        function handler(req, res, next) {
          expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);
          expect(req.swagger.path).to.deep.equal(env.files.parsed.petPath);
          expect(req.swagger.operation).to.deep.equal(env.files.parsed.petGetOperation);

          ++counter === 12 ? res.sendStatus(test_passed) : next();
        }

        function error(req, res, next) {
          counter = -999;
          res.sendStatus(test_failed);
        }
      });
    }
  );
});
