/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';


/*
* Abstract class for basic PiCl functions
*   -Checks if sync is turned on
*   -gets connected persona ID
*   -gets auth-token from keyserver.
*/
var PiCl = {

  _serverHost: null,
  _keyServerHost: null,
  _syncFlag: null, // if sync_flag is set then sync service is active

  init: function picl_init(options) {
    options = options || {};
  },

  handleError: function picl_handleError(error) {
    console.error(error);
  },

  // Gets logged in Persona ID
  getID: function get_personaID() {

  },

  enableSync: function picl_enableSync(args) {
    args = args || {};

  },

  disableSync: function picl_disableSync() {

  },

  /* POST /user
  *  Valid args:
  *   -email:string User's email (required)
  */
  createUser: function picl_createUser(args) {
    args = args || {};
    if (!args.email) {
      handleError('No email in argument to createUser' + args);
    }
  },

  /* GET /user/?email=<email>
  *  Valid args:
  *   -email:string User's email (required)
  */
  getUser: function picl_getUser(args) {
    args = args || {};
  }
};
