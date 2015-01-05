'use strict';

var path = require('path');
var fs = require('fs');
var url = require('url');
var _ = require('lodash');
var nock = require('nock');
var express = require('express');
var supertest = require('supertest');
var swaggerServer = require('../');
var util = require('../lib/util');

var env;

// Create globals for Chai and Sinon
global.expect = require('chai').expect;
global.sinon = require('sinon');

module.exports = env = {
    /**
     * Initializes state before each test
     */
    beforeEach: function() {
        global.currentTest = this.currentTest;
        currentTest.swaggerServers = [];
        currentTest.httpServers = [];
    },


    /**
     * Cleans up after each test
     */
    afterEach: function() {
        currentTest.swaggerServers.forEach(function(swaggerServer) {
            swaggerServer.__unwatchSwaggerFiles();
        });
        currentTest.httpServers.forEach(function(httpServer) {
            if (httpServer.address()) {
                httpServer.close();
            }
            else {
                httpServer.once('listening', httpServer.close.bind(httpServer));
            }
        });
    },


    /**
     * Creates a SwaggerServer instance.
     * @param   {string} filePath
     * @returns {SwaggerServer}
     */
    swaggerServer: function(filePath) {
        var server = swaggerServer(filePath);
        server.__currentTest = currentTest;
        currentTest.swaggerServers.push(server);

        var listen = server.listen;
        server.listen = function() {
            var httpServer = listen.apply(server, arguments);
            currentTest.httpServers.push(httpServer);
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
    disableWarnings: function() {
        process.env.WARN = 'off';
    },


    /**
     * Enables Swagger-Server's warnings
     */
    enableWarnings: function() {
        process.env.WARN = 'on';
    },


    /**
     * Modifies the modified date of the given file, which will trigger Swagger-Server's file watcher.
     * @param {...string} filePaths
     */
    touchFile: function(filePaths) {
        var args = _.rest(arguments, 0);

        // Wait a few milliseconds so there's a timestamp change when called sequentially
        setTimeout(function() {
            args.forEach(function(file) {
                fs.utimesSync(file, new Date(), new Date());
            });
        }, 10);
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
        params = _.rest(arguments);
        return function() {
            fn.apply(null, params);
        };
    },


    /**
     * Paths to sample Swagger spec files.
     */
    files: {
        blank: path.join(__dirname, 'files', 'blank.yaml'),
        minimal: path.join(__dirname, 'files', 'minimal.yaml'),
        minimalHttps: path.join(__dirname, 'files', 'minimal-https.yaml'),
        minimalWithHost: path.join(__dirname, 'files', 'minimal-with-host.yaml'),
        externalRefs: path.join(__dirname, 'files', 'external-refs.yaml'),
        pet: path.join(__dirname, 'files', 'pet.yaml'),
        error: path.join(__dirname, 'files', 'error.yaml'),
        temp: path.join(__dirname, 'files', '.temp.yml'),
        ENOENT: path.join(__dirname, 'files', 'doesNotExist.yaml'),

        /**
         * Parsed Swagger specs.
         */
        parsed: {
            minimal: require('./files/minimal.json'),
            externalRefs: require('./files/external-refs.json')
        },

        /**
         * Local-file metadata
         */
        metadata: {
            minimal: {
                baseDir: path.join(__dirname, 'files') + '/',
                files: [path.join(__dirname, 'files', 'minimal.yaml')],
                urls: [],
                $refs: {}
            },
            externalRefs: {
                baseDir: path.join(__dirname, 'files') + '/',
                files: [
                    path.join(__dirname, 'files', 'external-refs.yaml'),
                    path.join(__dirname, 'files', 'error.yaml'),
                    path.join(__dirname, 'files', 'pet.yaml')
                ],
                urls: [],
                $refs: (function() {
                    var $refs = {};
                    $refs['pet.yaml'] = require('./files/pet.json');
                    $refs['./pet.yaml'] = require('./files/pet.json');
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
        minimal: 'http://nock/minimal.yaml',
        externalRefs: 'http://nock/external-refs.yaml',
        pet: 'http://nock/pet.yaml',
        error: 'http://nock/error.yaml',
        error404: 'http://nock/404.yaml',

        /**
         * URL metadata
         */
        metadata: {
            minimal: {
                baseDir: 'http://nock/',
                files: [],
                urls: [url.parse('http://nock/minimal.yaml')],
                $refs: {}
            },
            externalRefs: {
                baseDir: 'http://nock/',
                files: [],
                "urls": [
                    url.parse('http://nock/external-refs.yaml'),
                    url.parse('http://nock/error.yaml'),
                    url.parse('http://nock/pet.yaml')
                ],
                $refs: (function() {
                    var $refs = {};
                    $refs['pet.yaml'] = require('./files/pet.json');
                    $refs['./pet.yaml'] = require('./files/pet.json');
                    $refs['http://nock/pet.yaml'] = require('./files/pet.json');
                    $refs['error.yaml'] = require('./files/error.json');
                    $refs['http://nock/error.yaml'] = require('./files/error.json');
                    return $refs;
                })()
            }
        }
    }
};

