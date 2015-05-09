'use strict';

var env        = require('./test-environment'),
    express    = require('express'),
    swagger    = require('../'),
    middleware = require('swagger-express-middleware');

describe('Exports', function() {
    it('should export the "createApplication" function',
        function() {
            expect(swagger).to.be.a('function');
        }
    );

    it('should export Swagger Express Middleware classes',
        function() {
            expect(swagger.DataStore).to.equal(middleware.DataStore);
            expect(swagger.MemoryDataStore).to.equal(middleware.MemoryDataStore);
            expect(swagger.FileDataStore).to.equal(middleware.FileDataStore);
            expect(swagger.Resource).to.equal(middleware.Resource);
        }
    );

    it('should export the same members as Express',
        function() {
            var expressKeys = Object.keys(express);
            var swaggerKeys = Object.keys(swagger);

            expect(expressKeys).to.have.length.above(5);
            expect(swaggerKeys).to.include.all.members(expressKeys);

            expressKeys.forEach(function(key) {
                expect(typeof express[key]).to.equal(typeof swagger[key]);
            });
        }
    );

    describe('createApplication function', function() {
        it('should work without the "new" operator',
            function() {
                var app = swagger(env.files.petStore);
                expect(app).to.be.a('function');
                currentTest.servers.push(app);
            }
        );

        it('should work with the "new" operator',
            function() {
                var app = new swagger(env.files.petStore);
                expect(app).to.be.a('function');
                currentTest.servers.push(app);
            }
        );

        it('should throw an error if no filename is given',
            function() {
                expect(env.call(swagger)).to.throw(Error, 'Expected a Swagger file or object');
            }
        );

        it('should not affect express',
            function() {
                expect(env.call(express)).not.to.throw();
            }
        );

        it('should not throw an immediate error if the filename is invalid',
            function(done) {
                env.disableWarningsForThisTest();

                // No exception is thrown because the file is parsed asynchronously
                var server = env.swaggerServer(env.files.ENOENT);

                // The error is thrown asynchronously
                server.on('error', function(err) {
                    expect(err).to.be.an.instanceOf(Error);
                    expect(err.status).to.equal(500);
                    expect(err.message).to.contain('ENOENT');

                    done();
                });
            }
        );

        it('should not throw an immediate error if the URL is invalid',
            function(done) {
                env.disableWarningsForThisTest();
                env.nock().get('/404.yaml').reply(404);

                // No exception is thrown because the url is downloaded asynchronously
                var server = env.swaggerServer(env.urls.error404);

                // The error is thrown asynchronously
                server.on('error', function(err) {
                    expect(err).to.be.an.instanceOf(Error);
                    expect(err.status).to.equal(500);

                    done();
                });
            }
        );
    });

    describe('Router function', function() {
        it('should work without the "new" operator',
            function() {
                var router = swagger.Router();
                expect(router).to.be.a('function');
            }
        );

        it('should work with the "new" operator',
            function() {
                var router = new swagger.Router();
                expect(router).to.be.a('function');
            }
        );

        it('should pass options to Express',
            function() {
                var router1 = new swagger.Router();
                var router2 = new swagger.Router({caseSensitive: true, strict: true});
                expect(router1.caseSensitive).to.be.undefined;
                expect(router1.strict).to.be.undefined;
                expect(router2.caseSensitive).to.be.true;
                expect(router2.strict).to.be.true;
            }
        );

        it('should convert Swagger-style paths to Express-style paths',
            function() {
                var router = new swagger.Router();
                router.get('/foo/{bar}/xyz{baz}', function(){});
                var layer = router.stack[0];
                expect(layer.keys[0].name).to.equal('bar');
                expect(layer.keys[1].name).to.equal('baz');
                expect(layer.route.path).to.equal('/foo/:bar/xyz:baz');
            }
        );
    });

    describe('Route class', function() {
        it('should work with the "new" operator',
            function() {
                var route = new swagger.Route('/foo');
                expect(route).to.be.an.instanceOf(swagger.Route);
            }
        );

        it('should not work without the "new" operator',
            function() {
                var route = swagger.Route('/foo');
                expect(route).to.be.undefined;
            }
        );

        it('should inherit from Express.Route',
            function() {
                var route = new swagger.Route('/foo');
                expect(route).to.be.an.instanceOf(express.Route);
            }
        );

        it('should convert Swagger-style paths to Express-style paths',
            function() {
                var route = new swagger.Route('/foo/{bar}/xyz{baz}');
                expect(route.path).to.equal('/foo/:bar/xyz:baz');
            }
        );

        it('should convert Swagger-style paths to Express-style paths via app.route',
            function() {
                var server = new swagger(env.files.petStore);
                var route = server.route('/foo/{bar}/xyz{baz}');
                expect(route).to.be.an.instanceOf(express.Route);
                expect(route.path).to.equal('/foo/:bar/xyz:baz');
            }
        );
    });
});
