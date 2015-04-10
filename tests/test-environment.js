'use strict';

var path      = require('path'),
    fs        = require('fs'),
    url       = require('url'),
    _         = require('lodash'),
    nock      = require('nock'),
    http = require('http'),
    express   = require('express'),
    supertest = require('supertest'),
    swagger   = require('../'),
    util      = require('../lib/util');


// Create globals for Chai and Sinon
global.expect = require('chai').expect;
global.sinon = require('sinon');

// Allow Nock and Supertest to play nice together
nock.enableNetConnect();

/**
 * Initializes state before each test
 */
beforeEach(function() {
    global.currentTest = this.currentTest;
    currentTest.servers = [];
    currentTest.servers = [];
});


/**
 * Cleans up after each test
 */
afterEach(function() {
    // Re-enable warnings, in case they were disabled for this test
    process.env.WARN = 'on';

    currentTest.servers.forEach(function(server) {
        if (server instanceof swagger.Server) {
            server.__parser.whenParsed(function() {
                server.__watcher.unwatchSwaggerFiles();
            });
        }
        else if (server instanceof http.Server) {
            if (server.address()) {
                server.close();
            }
            else {
                server.once('listening', server.close.bind(server));
            }
        }
    });
});


var env = module.exports = {
    /**
     * Creates an Express application, via Swagger Server.
     * @param {string} filePath
     * @returns {e.application}
     */
    swaggerApp: function(filePath) {
        return env.swaggerServer(filePath).app;
    },

    /**
     * Creates a Swagger Server instance.
     * @param   {string} filePath
     * @returns {SwaggerServer}
     */
    swaggerServer: function(filePath) {
        var server = new swagger.Server();
        currentTest.servers.push(server);

        if (filePath) {
            server.parse(filePath);
        }

        server.app.set('env', 'test'); // Turns on enhanced debug/error info
        var listen = server.app.listen;
        server.app.listen = function() {
            var httpServer = listen.apply(server.app, arguments);
            currentTest.servers.push(httpServer);
            return httpServer;
        };

        return server;
    },


    /**
     * Creates and configures an Express app.
     */
    express: function(middleware) {
        var app = express();
        app.set('env', 'test'); // Turns on enhanced debug/error info
        if (middleware) app.use(middleware);
        return app;
    },


    /**
     * Creates and configures a Nock mock web server.
     */
    nock: function() {
        return nock('http://nock');
    },


    /**
     * Creates and configures a Supertest instance.
     */
    supertest: function(middleware) {
        return supertest(middleware);
    },


    /**
     * Disables Swagger-Server's warnings, to prevent them from cluttering the console during failure tests.
     */
    disableWarningsForThisTest: function() {
        process.env.WARN = 'off';
    },


    /**
     * Modifies the modified date of the given file, which will trigger Swagger-Server's file watcher.
     * @param {...string} filePaths
     */
    touchFile: function(filePaths) {
        var args = _.drop(arguments, 0);
        currentTest.timeout(4000);

        // NOTE: Some OS'es only track file times to the full second, hence the long timeout
        setTimeout(function() {
            args.forEach(function(file) {
                fs.utimesSync(file, new Date(), new Date());
            });
        }, 1000);
    },


    /**
     * Creates a copy of the given file at the given path.
     */
    copyFile: function(src, dest) {
        fs.writeFileSync(dest, fs.readFileSync(src));
    },


    /**
     * Returns a function that calls the given function with the given parameters.
     * This is useful for `expect(fn).to.throw` tests.
     */
    call: function(fn, params) {
        params = _.drop(arguments);
        return function() {
            fn.apply(null, params);
        };
    },


    /**
     * Paths to sample Swagger spec files.
     */
    files: {
        blank: path.join(__dirname, 'files', 'blank.yaml'),
        petStore: path.join(__dirname, 'files', 'petstore.yaml'),
        petStoreWithPort: path.join(__dirname, 'files', 'petstore-with-port.yaml'),
        petStoreNoBasePath: path.join(__dirname, 'files', 'petstore-no-basePath.yaml'),
        petStoreExternalRefs: path.join(__dirname, 'files', 'petstore-external-refs.yaml'),
        testResponses: path.join(__dirname, 'files', 'test-responses.yaml'),
        pet: path.join(__dirname, 'files', 'pet.yaml'),
        error: path.join(__dirname, 'files', 'error.yaml'),
        temp: path.join(__dirname, 'files', '.temp.yml'),
        ENOENT: path.join(__dirname, 'files', 'doesNotExist.yaml'),

        /**
         * Parsed Swagger specs.
         */
        parsed: {
            petStore: require('./files/petstore.json'),
            petStoreExternalRefs: _.omit(require('./files/petstore.json'), 'definitions'),
            petStoreNoBasePath: _.omit(require('./files/petstore.json'), 'basePath'),
            petsPath: require('./files/petstore.json').paths['/pets'],
            petsPostOperation: require('./files/petstore.json').paths['/pets'].post,
            petPath: require('./files/petstore.json').paths['/pets/{name}'],
            petGetOperation: require('./files/petstore.json').paths['/pets/{name}'].get
        },

        /**
         * Local-file metadata
         */
        metadata: {
            petStore: {
                baseDir: path.join(__dirname, 'files') + '/',
                files: [path.join(__dirname, 'files', 'petstore.yaml')],
                urls: [],
                $refs: {
                    'pet': require('./files/pet.json'),
                    'error': require('./files/error.json'),
                    '#/definitions/pet': require('./files/pet.json'),
                    '#/definitions/error': require('./files/error.json')
                }
            },
            petStoreExternalRefs: {
                baseDir: path.join(__dirname, 'files') + '/',
                files: [
                    path.join(__dirname, 'files', 'petstore-external-refs.yaml'),
                    path.join(__dirname, 'files', 'error.yaml'),
                    path.join(__dirname, 'files', 'pet.yaml')
                ],
                urls: [],
                $refs: (function() {
                    var $refs = {};
                    $refs['pet.yaml'] = require('./files/pet.json');
                    $refs[path.join(__dirname, 'files', 'pet.yaml')] = require('./files/pet.json');
                    $refs['error.yaml'] = require('./files/error.json');
                    $refs[path.join(__dirname, 'files', 'error.yaml')] = require('./files/error.json');
                    return $refs;
                })()
            }
        }
    },


    /**
     * URLs to the sample Swagger spec files.
     */
    urls: {
        blank: 'http://nock/blank.yaml',
        petStore: 'http://nock/petstore.yaml',
        petStoreExternalRefs: 'http://nock/petstore-external-refs.yaml',
        pet: 'http://nock/pet.yaml',
        error: 'http://nock/error.yaml',
        error404: 'http://nock/404.yaml',

        /**
         * URL metadata
         */
        metadata: {
            petStore: {
                baseDir: 'http://nock/',
                files: [],
                urls: [url.parse('http://nock/petstore.yaml')],
                $refs: {}
            },
            petStoreExternalRefs: {
                baseDir: 'http://nock/',
                files: [],
                "urls": [
                    url.parse('http://nock/petstore-external-refs.yaml'),
                    url.parse('http://nock/error.yaml'),
                    url.parse('http://nock/pet.yaml')
                ],
                $refs: (function() {
                    var $refs = {};
                    $refs['pet.yaml'] = require('./files/pet.json');
                    $refs['http://nock/pet.yaml'] = require('./files/pet.json');
                    $refs['error.yaml'] = require('./files/error.json');
                    $refs['http://nock/error.yaml'] = require('./files/error.json');
                    return $refs;
                })()
            }
        }
    }
};

