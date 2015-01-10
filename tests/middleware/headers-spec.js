describe('header middleware', function() {
    'use strict';

    var env = require('../test-environment');
    beforeEach(env.beforeEach);
    afterEach(env.afterEach);

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
            env.disableWarningsForThisTest();

            var server = env.swaggerServer(env.files.testResponses);
            var supertest = env.supertest(server);
            supertest
                .get('/test/404')
                .expect(404)
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

});
