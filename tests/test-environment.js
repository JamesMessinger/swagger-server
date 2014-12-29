'use strict';

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var nock = require('nock');

var env;

// Create globals for Chai and Sinon
global.expect = require('chai').expect;
global.sinon = require('sinon');

// Suppress warning messages because they clutter up the unit test output
console.warn = function() {
};

module.exports = env = {
    /**
     * A mock HTTP server
     */
    nock: nock('http://nock'),

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
        ENOENT: path.join(__dirname, 'files', 'doesNotExist.yaml'),

        /**
         * Parsed Swagger specs.
         */
        parsed: {
            minimal: require(path.join(__dirname, 'files', 'minimal.json')),
            externalRefs: require(path.join(__dirname, 'files', 'external-refs.json'))
        }
    },


    /**
     * URLs to the sample Swagger spec files.
     */
    urls: {
        blank: 'http://nock/blank.yaml',
        minimal: 'http://nock/minimal.yaml',
        externalRefs: 'http://nock/externalRefs.yaml',
        error404: 'http://nock/404.yaml'
    },


    /**
     * Dummy SSL key to test HTTPS functionality.
     */
    sslKey: {
        pfx: fs.readFileSync(path.join(__dirname, 'files', 'ssl.pfx'))
    },


    /**
     * Modifies the modified date of the given file, which will trigger Swagger-Server's file watcher.
     */
    touchFile: function(filePath) {
        // Wait a few milliseconds so there's a timestamp change when called sequentially
        setTimeout(function() {
            fs.utimesSync(filePath, new Date(), new Date());
        }, 10);
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
    }
};

