describe('App settings', function() {
    'use strict';

    var env = require('../test-environment');
    beforeEach(env.beforeEach);
    afterEach(env.afterEach);

    it('should expose the enable and disable methods',
        function() {
            var server = env.swaggerServer(env.files.petStore);

            // This setting doesn't exist yet, so it's disabled
            expect(server.enabled('my setting')).to.be.false;
            expect(server.disabled('my setting')).to.be.true;

            // This setting is enabled by default in Express
            expect(server.enabled('x-powered-by')).to.be.true;
            expect(server.disabled('x-powered-by')).to.be.false;

            // This setting is set to "?callback=" by default in Express
            expect(server.enabled('jsonp callback name')).to.be.true;
            expect(server.disabled('jsonp callback name')).to.be.false;

            // Enabling this setting creates it
            server.enable('my setting');
            expect(server.enabled('my setting')).to.be.true;
            expect(server.disabled('my setting')).to.be.false;
        }
    );

    it('should expose the get and set methods',
        function() {
            var server = env.swaggerServer(env.files.petStore);

            // This setting doesn't exist yet
            expect(server.get('my setting')).to.be.undefined;

            // This setting is enabled by default in Express
            expect(server.get('x-powered-by')).to.be.true;

            // This setting is set to "?callback=" by default in Express
            expect(server.get('jsonp callback name')).to.equal('callback');

            // Setting this setting creates it
            server.set('my setting', 'hello world');
            expect(server.get('my setting')).to.be.equal('hello world');
        }
    );

    it('should set custom Swagger-Server properties',
        function() {
            var server = env.swaggerServer(env.files.petStore);

            expect(server.enabled('watch files')).to.be.true;
            expect(server.enabled('mock')).to.be.true;
            expect(server.enabled('CORS')).to.be.true;
        }
    );

});
