var swagger = require('../../');

describe('SwaggerRouter constructor', function() {
    'use strict';

    it('should use default settings if no overrides are given',
        function() {
            var server = new swagger.Server('foo');
            expect(server.settings).to.deep.equal({
                enableCORS: true,
                enableMocks: true
            });
        }
    );

    it('should merge the settings param',
        function() {
            var server = new swagger.Server('foo', {enableCORS: false, foo: 'bar'});
            expect(server.settings).to.deep.equal({
                enableCORS: false,
                enableMocks: true,
                foo: 'bar'
            });
        }
    );

    it('should clone prototype.settings if no overrides are given',
        function() {
            var server = new swagger.Server('foo');

            // The server instance should have the same settings as the prototype
            expect(server.settings).to.deep.equal(swagger.Server.prototype.settings);

            // But the "settings" object should be a new instance
            expect(server.settings).not.to.equal(swagger.Server.prototype.settings);
        }
    );

    it('should clone prototype.settings if overrides are given',
        function() {
            var server = new swagger.Server('foo', {enableMocks: false, foo: 'bar'});

            // The overridden settings should apply to this server instance
            expect(server.settings).to.deep.equal({
                enableCORS: true,
                enableMocks: false,
                foo: 'bar'
            });

            // But the prototype.settings object should not have been modified
            expect(swagger.Server.prototype.settings).to.deep.equal({
                enableCORS: true,
                enableMocks: true
            });
        }
    );

});
