describe('middleware', function() {
    'use strict';

    var env = require('./test-environment');
    var test_passed = 599, test_failed = 500;

    beforeEach(env.beforeEach);
    afterEach(env.afterEach);

    it('should support Express-style paths',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);
            var counter = 0;

            supertest.get('/api/pets/fido').expect(test_passed, done);

            // None of these should be called
            server.post('/api/pets/fido', error);
            server.delete('/api/pets/:name', error);
            server.get('/api/pets/spot', error);
            server.route('/api/pets/:name/')
                .put(error)
                .options(error)
                .post(error);

            // All of these should be called
            server.get('/api/pets/fido', handler);
            server.get('/:api/:pets/:name', handler);
            server.all('/api/pets/fido/', handler);
            server.use('/api/pets/:name', handler);
            server.route('/api/pets/:name/')
                .get(handler)
                .all(handler);

            function handler(req, res, next) {
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);
                expect(req.swagger.path).to.deep.equal(env.files.parsed.petPath);
                expect(req.swagger.operation).to.deep.equal(env.files.parsed.petGetOperation);

                ++counter === 6 ? res.sendStatus(test_passed) : next();
            }

            function error(req, res, next) {
                counter = -999;
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

            // None of these should be called
            server.post('/api/pets/fido', error);
            server.delete('/api/pets/{name}', error);
            server.get('/api/pets/spot', error);
            server.route('/api/pets/{name}/')
                .put(error)
                .options(error)
                .post(error);

            // All of these should be called
            server.get('/api/pets/fido', handler);
            server.get('/{api}/{pets}/{name}', handler);
            server.all('/api/pets/fido/', handler);
            server.use('/api/pets/{name}', handler);
            server.route('/api/pets/{name}/')
                .get(handler)
                .all(handler);

            function handler(req, res, next) {
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);
                expect(req.swagger.path).to.deep.equal(env.files.parsed.petPath);
                expect(req.swagger.operation).to.deep.equal(env.files.parsed.petGetOperation);

                ++counter === 6 ? res.sendStatus(test_passed) : next();
            }

            function error(req, res, next) {
                counter = -999;
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

    describe('X-Powered-By', function() {
        it('should set the X-Powered-By HTTP header on a successful response',
            function(done) {
                var server = env.swaggerServer(env.files.testResponses);
                var supertest = env.supertest(server);
                supertest
                    .get('/test/200')
                    .expect(200)
                    .expect('x-powered-by', 'Swagger Server', done);
            }
        );

        it('should set the X-Powered-By HTTP header on an error response (within the API\'s basePath)',
            function(done) {
                var server = env.swaggerServer(env.files.testResponses);
                var supertest = env.supertest(server);

                supertest
                    .get('/test/507')
                    .expect(507)
                    .expect('x-powered-by', 'Swagger Server', done);
            }
        );

        it('should set the X-Powered-By HTTP header on an error response (outside the API\'s basePath',
            function(done) {

                var server = env.swaggerServer(env.files.testResponses);
                var supertest = env.supertest(server);
                supertest
                    .get('/404')    // Missing "/test"
                    .expect(404)
                    .expect('x-powered-by', 'Swagger Server', done);
            }
        );

        it('should not set the X-Powered-By HTTP header if "x-powered-by" is disabled',
            function(done) {
                var server = env.swaggerServer(env.files.testResponses);
                server.disable('x-powered-by');

                var supertest = env.supertest(server);
                supertest
                    .get('/test/200')
                    .expect(200)
                    .expect(function(res) { return res.get('x-powered-by'); })
                    .end(done);
            }
        );
    })
});
