'use strict';

var session = require('../sessions');

module.exports = {
  /**
   * GET /projects/{projectId}
   */
  get: [
    session.identifyUser,
    session.mustBeLoggedIn
  ],

  /**
   * PATCH /projects/{projectId}
   */
  patch: [
    session.identifyUser,
    session.adminsOnly
  ],

  /**
   * DELETE /projects/{projectId}
   */
  delete: [
    session.identifyUser,
    session.adminsOnly
  ]
};
