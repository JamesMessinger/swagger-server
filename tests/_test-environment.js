'use strict';

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var nock = require('nock');

global.expect = require('chai').expect;
global.sinon = require('sinon');

global.env = {
  /**
   * The "createServer" function that's exported by Swagger-Server
   * @type {createServer}
   */
  createServer: require('../'),

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
    externalRefs: path.join(__dirname, 'files', 'externalRefs.yaml')
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
   * Temporarily appends text to the given file, which will trigger Swagger-Server's file watcher.
   * The file is returned to its previous contents immediately.
   * If no text is provided, then a blank line is appended.
   */
  modifyFile: function(filePath, append, callback) {
    // Shift args if needed
    if (_.isFunction(append)) {
      callback = append;
      append = '\n';
    }

    fs.readFile(filePath, {encoding: 'utf8'}, function(err, data) {
      if (err) return callback(err);

      // Add a blank line to the file
      fs.writeFile(filePath, data.toString() + '\n', function(err) {
        if (err) return callback(err);

        // Restore the file's original contents
        fs.writeFile(env.files.minimal, data.toString());

        callback();
      });
    });
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

