'use strict';

var session = require('../sessions');

module.exports = {
  /**
   * GET /employees/{username}
   */
  get: [
    session.identifyUser,
    session.yourselfOnly
  ],

  /**
   * PATCH /employees/{username}
   */
  patch: [
    session.identifyUser,
    session.yourselfOnly
  ],

  /**
   * DELETE /employees/{username}
   */
  delete: [
    session.identifyUser,
    session.yourselfOnly
  ]
};
