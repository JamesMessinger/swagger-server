'use strict';

var swagger = require('swagger-server'),
    session = require('../sessions');

module.exports = {
  /**
   * GET /sessions/{sessionId}
   */
  get: [
    session.identifyUser,
    session.yourselfOnly
  ],

  /**
   * DELETE /sessions/{sessionId}
   */
  delete: [
    session.identifyUser,
    session.yourselfOnly
  ]
};
