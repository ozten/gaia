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
  _keyServerHost: 'http://127.0.0.1:8090',
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
      handleError('No email in argument to createUser ' + args);
    }

    else {
      var xhr = new XMLHttpRequest({
        mozSystem: true
      });
      xhr.onreadystatechange = function() {
        if (xhr.status === 200 && xhr.readystatechange === 4) {
          console.log(xhr.response);
        }
      };
      xhr.onerror = function() {
        handleError(xhr.response);
      };
      xhr.open('POST', _keyServerHost + '/user', true);
      xhr.send(args);
    }
  },

  /* GET /user/?email=<email>
  *  Valid args:
  *   -email:string User's email (required)
  */
  getUser: function picl_getUser(args) {
    args = args || {};
    if (!args.email) {
      handleError('No email in argument to getUser ' + args);
    }

    else {
      var xhr = new XMLHttpRequest({
        mozSystem: true
      });
      xhr.onreadystatechange = function() {
        if (xhr.status === 200 && xhr.readystatechange === 4) {
          console.log(xhr.response);
        }
      };
      xhr.onerror = function() {
        alert(xhr.response);
        //handleError(xhr.response);
      };
      xhr.open('GET', _keyServerHost + '/user/?email=' + args.email, true);
      xhr.send();
    }
  }
};


//XXX Remove these buttons when done testing.
var getUser_button = document.getElementById('mock-picl-getUser');
getUser_button.addEventListener('click', function() {

  PiCl.getUser({'email': 'ktyaks@gmail.com'});
  //alert('mock-picl-getUser');

});

var createUser_button = document.getElementById('mock-picl-createUser');
createUser_button.addEventListener('click', function() {

  //PiCl.createUser({'email':'ktyaks@gmail.com'})
  alert('mock-picl-createUser');

});
///
