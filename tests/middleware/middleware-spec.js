describe('middleware', function() {
    'use strict';

    var env = require('../test-environment');
    var test_passed = 599, test_failed = 500;

    beforeEach(env.beforeEach);
    afterEach(env.afterEach);

    it('should support Express-style paths',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);
            var counter = 0;

            supertest.get('/api/pets/fido').expect(test_passed, done);

            // All of these should be called
            server.get('/api/pets/fido', handler);
            server.get('/api/pets/fido/', handler);
            server.get('/api/pets/:name', handler);
            server.get('/api/pets/:name/', handler);
            server.get('/:api/:pets/:name', handler);

            // None of these should be called
            server.post('/api/pets/fido', error);
            server.post('/api/pets/:name', error);
            server.get('/api/pets/spot', error);

            function handler(req, res, next) {
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);
                expect(req.swagger.path).to.deep.equal(env.files.parsed.petPath);
                expect(req.swagger.operation).to.deep.equal(env.files.parsed.petGetOperation);

                ++counter === 5 ? res.sendStatus(test_passed) : next();
            }

            function error(req, res, next) {
                res.sendStatus(test_failed);
            }
        }
    );

    it('should support Swagger-style paths',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);
            var counter = 0;

            supertest.get('/api/pets/fido').expect(test_passed, done);

            // All of these should be called
            server.get('/api/pets/fido', handler);
            server.get('/api/pets/fido/', handler);
            server.get('/api/pets/{name}', handler);
            server.get('/api/pets/{name}/', handler);
            server.get('/{api}/{pets}/{name}', handler);

            // None of these should be called
            server.post('/api/pets/fido', error);
            server.post('/api/pets/{name}', error);
            server.get('/api/pets/spot', error);

            function handler(req, res, next) {
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);
                expect(req.swagger.path).to.deep.equal(env.files.parsed.petPath);
                expect(req.swagger.operation).to.deep.equal(env.files.parsed.petGetOperation);

                ++counter === 5 ? res.sendStatus(test_passed) : next();
            }

            function error(req, res, next) {
                res.sendStatus(test_failed);
            }
        }
    );

    it('should send an error downstream if the API is invalid',
        function(done) {
            env.disableWarningsForThisTest();

            var server = env.swaggerServer(env.files.blank);
            var supertest = env.supertest(server);

            // Doesn't really matter what we browse to here, since the API is invalid
            supertest.post('/pets').expect(test_passed, done);

            // Should NOT get called
            server.use(function(req, res, next) {
                res.status(test_failed)
                    .send('Success middleware was called. Only Error middleware should have been called');
            });

            // Should get called
            server.use(function(err, req, res, next) {
                expect(err).to.be.an.instanceOf(SyntaxError);
                expect(err.message).to.contain('Error parsing file');

                res.sendStatus(test_passed);
            });
        }
    );

});
