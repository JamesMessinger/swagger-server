'use strict';

module.exports = Watcher;

var fs   = require('fs'),
    util = require('./helpers/util');


/**
 * Watches files for changes and updates the server accordingly.
 * @constructor
 */
function Watcher() {}


/**
 * Initializes the Watcher
 * @private
 */
Watcher.prototype.__init = function() {
    var self = this;

    /**
     * The Swagger API files that are being watched.
     * @type {FSWatcher[]}
     * @private
     */
    self.__watchedSwaggerFiles = [];


    // Watch Swagger API files
    self.on('parsed', function(api, metadata) {
        // Watch all the files that were parsed
        self.__unwatchSwaggerFiles();
        self.__watchSwaggerFiles(metadata.files);
    });
};


/**
 * Stops watching Swagger files for changes.
 * @private
 */
Watcher.prototype.__unwatchSwaggerFiles = function(files) {
    var watcher;
    while (watcher = this.__watchedSwaggerFiles.pop()) {
        watcher.close();
    }
};


/**
 * Watches the given Swagger file, and re-parses the API if any of them change.
 * @param {string[]} files
 * @private
 */
Watcher.prototype.__watchSwaggerFiles = function(files) {
    var self = this;

    if (self.enabled('watch files')) {
        files.forEach(function(file) {
            // Don't throw an error if the file doesn't exist.
            // An error will have already been thrown by the parser.
            if (fs.existsSync(file)) {
                var watcher = fs.watch(file, {persistent: false});
                self.__watchedSwaggerFiles.push(watcher);

                watcher.on('change', function() {
                    util.debug('File change detected: %s', file);
                    self.emit('change', file);
                    self.__parse();
                });

                watcher.on('error', function(err) {
                    util.warn(err, 'Error watching file "%s"', file);
                });
            }
        });
    }
};
