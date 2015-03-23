'use strict';

module.exports = Parser;

var util   = require('./util');


/* istanbul ignore next: empty constructor */
/**
 * Parses a Swagger API.
 * @constructor
 */
function Parser() {}


/**
 * Initializes the Parser
 * @private
 */
Parser.prototype.__init = function() {
    /**
     * The path of the main Swagger file.
     * @type {string}
     * @private
     */
    this.__swaggerPath = '';

    /**
     * Are we currently in the middle of parsing?
     * @type {boolean}
     * @private
     */
    this.__parsing = false;

    /**
     * Have we finished parsing the file?
     * @type {boolean}
     * @private
     */
    this.__parsed = false;

    /**
     * The parsed Swagger API
     * @type {SwaggerObject|null}
     * @private
     */
    this.__api = null;

    /**
     * Metadata about the Swagger API
     * @type {object|null}
     * @private
     */
    this.__metadata = null;
};


/**
 * Parses the given Swagger file.
 *
 * @param {string}  [swaggerPath]   The path of a Swagger spec file (JSON or YAML)
 * @private
 */
Parser.prototype.__parse = function(swaggerPath) {
    var self = this;
    self.__swaggerPath = swaggerPath = swaggerPath || self.__swaggerPath;

    if (self.__parsing) {
        return;
    }

    util.debug('Parsing Swagger file "%s"', swaggerPath);
    self.__parsed = false;
    self.__parsing = true;
    this.__middleware.init(swaggerPath, function(err, middleware, api, metadata) {
        self.__parsing = false;
        self.__parsed = true;
        self.__api = api;
        self.__metadata = metadata;

        if (err) {
            err.status = 500;
            util.warn(err);

            // Don't emit the "error" event unless there are listeners;
            // otherwise, Node will throw an Error
            if (self.listeners('error').length > 0) {
                self.emit('error', err);
            }
        }

        // Emit a "parsed" event, regardless of whether there was an error
        util.debug('Done parsing Swagger file "%s"', swaggerPath);
        self.emit('parsed', api, metadata);
    });
};


/**
 * Calls the given function when parsing is complete, or immediately if parsing is already complete.
 *
 * @param {function} callback
 * @private
 */
Parser.prototype.__whenParsed = function(callback) {
    var self = this;

    if (self.__parsed) {
        callback.call(null, self.__api, self.__metadata);
    }
    else {
        self.once('parsed', function(api, metadata) {
            callback.call(null, api, metadata);
        });
    }
};
