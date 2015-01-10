describe('metadata middleware', function() {
    'use strict';

    var env = require('../test-environment');
    var test_passed = 599, test_failed = 500;

    beforeEach(env.beforeEach);
    afterEach(env.afterEach);

    it('should set req.swagger properties',
        function(done) {
            var server = env.swaggerServer(env.files.petStoreExternalRefs);
            var supertest = env.supertest(server);

            supertest.post('/api/pets').expect(test_passed, done);

            server.post('/api/pets', function(req, res, next) {
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStoreExternalRefs);
                expect(req.swagger.path).to.deep.equal(env.files.parsed.petsPath);
                expect(req.swagger.operation).to.deep.equal(env.files.parsed.petsPostOperation);

                res.sendStatus(test_passed);
            });
        }
    );

    it('should set req.swagger.api, even if the path isn\'t matched',
        function(done) {
            env.disableWarningsForThisTest();

            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);

            // Browse to a path that's not defined in the Swagger API
            supertest.get('/foo').expect(test_passed, done);

            server.get('/foo', function(req, res, next) {
                // req.swagger.api should be set, even though the request is not a Swagger path
                expect(req.swagger).to.be.an('object');
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);

                // req.swagger.path and req.swagger.operation should be null
                expect(req.swagger.path).to.be.null();
                expect(req.swagger.operation).to.be.null();

                res.sendStatus(test_passed);
            });
        }
    );

    it('should set req.swagger, even if the API is invalid',
        function(done) {
            env.disableWarningsForThisTest();

            var server = env.swaggerServer(env.files.blank);
            var supertest = env.supertest(server);

            supertest.get('/foo').expect(test_passed, done);

            server.use(function(err, req, res, next) {
                // req.swagger should be set, even though the API is invalid
                expect(req.swagger).to.be.an('object');

                // req.swagger.api, req.swagger.path, and req.swagger.operation should be null
                expect(req.swagger.api).to.be.null();
                expect(req.swagger.path).to.be.null();
                expect(req.swagger.operation).to.be.null();

                res.sendStatus(test_passed);
            });
        }
    );

    it('should set req.swagger.api and req.swagger.path, even if the operation isn\'t matched',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);

            // The path IS defined in the Swagger API, but there's no PUT operation
            supertest.put('/api/pets').expect(test_passed, done);

            server.put('/api/pets', function(req, res, next) {
                // req.swagger.api and req.swagger.path should be set, even though the operation is not valid
                expect(req.swagger).to.be.an('object');
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);
                expect(req.swagger.path).to.deep.equal(env.files.parsed.petsPath);

                // req.swagger.operation should be null
                expect(req.swagger.operation).to.be.null();

                res.sendStatus(test_passed);
            });
        }
    );

    it('should set req.swagger when the API has no basePath',
        function(done) {
            var server = env.swaggerServer(env.files.petStoreNoBasePath);
            var supertest = env.supertest(server);

            supertest.post('/pets').expect(test_passed, done);

            server.post('/pets', function(req, res, next) {
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStoreNoBasePath);
                expect(req.swagger.path).to.deep.equal(env.files.parsed.petsPath);
                expect(req.swagger.operation).to.deep.equal(env.files.parsed.petsPostOperation);

                res.sendStatus(test_passed);
            });
        }
    );

    it('should not set req.swagger.path or req.swagger.operation for requests that aren\'t under the API\'s "basePath"',
        function(done) {
            env.disableWarningsForThisTest();

            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);

            // Missing "/api"
            supertest.post('/pets').expect(test_passed, done);

            server.post('/pets', function(req, res, next) {
                // req.swagger.api should be set, even though the request is not under the "basePath"
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);

                // req.swagger.path and req.swagger.operation should be null
                expect(req.swagger.path).to.be.null();
                expect(req.swagger.operation).to.be.null();

                res.sendStatus(test_passed);
            });
        }
    );

    it('should use case-insensitive matching if "case sensitive routing" is disabled',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);
            var counter = 0;

            // NOTE: "case sensitive routing" is disabled by default in Express,
            // so "/PeTs" should match the "/pets" path
            supertest.post('/api/PeTs').expect(test_passed, done);

            // All of these should get called
            server.post('/api/PeTs/', handler);
            server.post('/api/PETS', handler);
            server.post('/api/pets', handler);

            function handler(req, res, next) {
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);
                expect(req.swagger.path).to.deep.equal(env.files.parsed.petsPath);
                expect(req.swagger.operation).to.deep.equal(env.files.parsed.petsPostOperation);

                ++counter === 3 ? res.sendStatus(test_passed) : next();
            }
        }
    );

    it('should use case-sensitive matching if "case sensitive routing" is enabled',
        function(done) {
            env.disableWarningsForThisTest();

            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);

            server.enable('case sensitive routing');

            // "/PeTs" should NOT match the "/pets" path
            supertest.post('/api/PeTs').expect(test_passed, done);

            server.post('/api/pets', function(req, res, next) {
                res.status(test_failed).send('This middleware should NOT have been called');
            });

            server.post('/api/PeTs', function(req, res, next) {
                // req.swagger.api should be set, even though the request is not a Swagger path
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);

                // req.swagger.path and req.swagger.operation should be null
                expect(req.swagger.path).to.be.null();
                expect(req.swagger.operation).to.be.null();

                res.sendStatus(test_passed);
            });
        }
    );

    it('should use loose matching if "strict routing" is disabled',
        function(done) {
            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);
            var counter = 0;

            // NOTE: "strict routing" is disabled by default in Express,
            // so "/pets/" should match the "/pets" path
            supertest.post('/api/pets/').expect(test_passed, done);

            // Both of these should get called
            server.post('/api/pETs', handler);
            server.post('/API/petS/', handler);

            function handler(req, res, next) {
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);
                expect(req.swagger.path).to.deep.equal(env.files.parsed.petsPath);
                expect(req.swagger.operation).to.deep.equal(env.files.parsed.petsPostOperation);

                ++counter === 2 ? res.sendStatus(test_passed) : next();
            }
        }
    );

    it('should use strict matching if "strict routing" is enabled',
        function(done) {
            env.disableWarningsForThisTest();

            var server = env.swaggerServer(env.files.petStore);
            var supertest = env.supertest(server);

            server.enable('strict routing');

            // "/pets/" should NOT match the "/pets" path
            supertest.post('/api/pets/').expect(test_passed, done);

            server.post('/api/pets', function(req, res, next) {
                res.status(test_failed).send('This middleware should NOT have been called');
            });

            server.post('/api/pets/', function(req, res, next) {
                // req.swagger.api should be set, even though the request is not a Swagger path
                expect(req.swagger.api).to.deep.equal(env.files.parsed.petStore);

                // req.swagger.path and req.swagger.operation should be null
                expect(req.swagger.path).to.be.null();
                expect(req.swagger.operation).to.be.null();

                res.sendStatus(test_passed);
            });
        }
    );

});
