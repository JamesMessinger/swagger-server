var swaggerServer = require('../lib');
var env = require('./test-environment');

describe('Module Exports', function() {
    'use strict';

    it('should export the "createServer" function',
        function() {
            expect(swaggerServer).to.be.a('function');
        }
    );

});
