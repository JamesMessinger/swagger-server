'use strict';

module.exports = Watcher;

var fs = require('fs');
var util = require('./util');


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
        if (metadata) {
            // Watch all the files that were parsed
            self.__unwatchSwaggerFiles();
            self.__watchSwaggerFiles(metadata.files);
        }
        else {
            // The parse failed.  If we're already watching files, then we'll just continue watching them.
            // If we're not already watching anything, then we'll just watch the main Swagger file.
            if (self.__watchedSwaggerFiles.length === 0 && fs.existsSync(self.__swaggerPath)) {
                self.__watchSwaggerFiles([self.__swaggerPath]);
            }
        }
    });

    // Unwatch all files when the server is stopped
    self.on('close', function() {
        self.__unwatchSwaggerFiles();
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
            var watcher = fs.watch(file, {persistent: false});
            self.__watchedSwaggerFiles.push(watcher);

            watcher.on('change', function() {
                util.debug('File change detected: %s', file);
                self.emit('change', file);
                self.__parse();
            });

            watcher.on('error', function(err) {
                err = util.newError(err, 'Error watching file "%s"', file);
                self.emit('error', err);
            });

        });
    }
};
