(function() {
  'use strict';

  var _ = require('lodash');
  var bodyParser = require('body-parser');
  var xmlParser = require('express-xml-bodyparser');
  var cookieParser = require('cookie-parser')();


  var middleware = [
    {
      regex: /json$/i,
      parser: bodyParser.json()
    },
    {
      regex: /^(text\/xml|application\/([\w!#\$%&`\*\-\.\^~]+\+)?xml)$/i,
      parser: xmlParser()
    },
    {
      regex: /text\/(plain|html|\w+)/i,
      parser: bodyParser.text({ type: ['text', 'html'] })
    },
    {
      regex: /urlencoded/i,
      parser: bodyParser.urlencoded({ extended: true })
    },
    {
      regex: /application\/octet-stream/i,
      parser: bodyParser.raw()
    }
  ];


  /**
   * Returns the body-parsing middleware that is needed for the given operation.
   */
  module.exports = function bodyParsers(swaggerObject, path, operation) {
    // Always add cookie-parser
    var parsers = [cookieParser];

    // Add a body-parser for each MIME type that the operation consumes
    var consumes = operation.consumes || swaggerObject.consumes || [];
    _.each(consumes, function(mimeType) {
      var foundParser = false;

      _.each(middleware, function(bodyParser) {
        if (bodyParser.regex.test(mimeType)) {
          parsers.push(bodyParser.parser);
          foundParser = true;
          return false; // exit the .each loop
        }
      });

      if (!foundParser) {
        console.warn('WARNING! Swagger-Server does not support the MIME type "%s"', mimeType);
      }
    });

    return _.unique(parsers);
  };

})();
