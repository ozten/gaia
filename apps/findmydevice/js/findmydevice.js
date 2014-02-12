/* global SettingsListener */
/* global asyncStorage */
/* global FindMyDeviceRequester */
/* global FindMyDeviceCommands */
/* global dump */

'use strict';

var FindMyDevice = {
  _serverUrl: null,

  _state: null,

  _enabled: false,

  // boolean, use null for uninitialized state
  // so we don't rely on findmydevice.registered
  // being read before findmydevice.enabled on
  // startup
  _registered: null,

  _registering: false,

  _reply: {},

  _alarmId: null,

  _requester: FindMyDeviceRequester,

  _commands: FindMyDeviceCommands,

  init: function fmd_init() {
    var self = this;

    var lock = SettingsListener.getSettingsLock();
    lock.get('findmydevice.api_url').onsuccess = function() {
      self._serverUrl = this.result['findmydevice.api_url'];
    };

    SettingsListener.observe('findmydevice.registered', false, function(value) {
      dump('findmydevice registered: ' + value);

      if (value === true) {
        asyncStorage.getItem('findmydevice-state', function(state) {
          self._registered = true;
          self._state = state;
          self._requester.setHawkCredentials(
            self._state.deviceid, self._state.secret);
          self._replyAndFetchCommands();
        });
      } else {
        self._registered = false;
        self._registerIfEnabled();
      }
    });

    SettingsListener.observe('findmydevice.enabled', false, function(value) {
      dump('findmydevice enabled: ' + value);

      self._enabled = value;

      if (self._registered === false) {
        self._registerIfEnabled();
      } else {
        self._replyAndFetchCommands();
      }
    });

    navigator.mozId.watch({
      wantIssuer: 'firefox-accounts',
      onlogin: this._onLogin.bind(this),
      onlogout: function wimf_fxa_onlogout() {
        SettingsListener.getSettingsLock().set({
          'findmydevice.enabled': false
        });
      }
    });

    navigator.mozSetMessageHandler('push', function(message) {
      dump('findmydevice got push notification!');
      self._replyAndFetchCommands();
    });

    navigator.mozSetMessageHandler('push-register', function(message) {
      dump('findmydevice lost push endpoint, re-registering');
      SettingsListener.getSettingsLock().set({
        'findmydevice.registered': false
      });
    });

    navigator.mozSetMessageHandler('alarm', function(alarm) {
      if (alarm.data.type !== 'findmydevice-alarm') {
        return;
      }

      if (self._registered === false) {
        self._registerIfEnabled();
      } else {
        self._replyAndFetchCommands();
      }
    });

    navigator.mozSetMessageHandler('connection', function(request) {
      if (request.keyword !== 'findmydevicetestcomms') {
        return;
      }

      var port = request.port;
      port.onmessage = function(event) {
        dump('got request for test command!');
        var enabled = self._enabled;
        self._enabled = true;
        self._processCommands(event.data);
        self.enabled = enabled;
      };
    });
  },

  _registerIfEnabled: function fmd_register() {
    dump('findmydevice attempting registration.');
    dump('enabled: ' + this._enabled +
        ', assertion: ' + this._assertion +
        ', registering: ' + this._registering);

    if (!this._enabled || this._registering) {
      return;
    }

    this._registering = true;

    // Refresh the assertion we have to make sure it's not expired.
    // This shouldn't bring up the Firefox Accounts dialog because that
    // would only happen if it is logged out, and in that case Find My Device
    // would have been disabled. We will continue the registration process
    // once we get a new assertion.
    navigator.mozId.request({
      audience: this._serverUrl
    });
  },

  _onLogin: function fmd_on_login(assertion) {
    var self = this;
    if (!this._enabled || !this._registering) {
      return;
    }

    // We are in the middle of a registration, so continue here by obtaining a
    // push endpoint

    var pushRequest = navigator.push.register();
    pushRequest.onsuccess = function fmd_push_handler() {
      dump('findmydevice received push endpoint!');

      var endpoint = pushRequest.result;
      if (self._enabled) {
        self._requestRegistration(assertion, endpoint);
      }

      self._registering = false;
    };

    pushRequest.onerror = function fmd_push_error_handler() {
      dump('findmydevice push request failed!');

      self._registering = false;
      self._scheduleAlarm('retry');
    };
  },

  _requestRegistration: function fmd_request_registration(assertion, endpoint) {
    var obj = {
      assert: assertion,
      pushurl: endpoint
    };

    if (this._state !== null) {
      obj.deviceid = this._state.deviceid;
    }

    this._requester.post('/register/', obj, function(response) {
      console.log('findmydevice successfully registered: ' +
        JSON.stringify(response));

      asyncStorage.setItem('findmydevice-state', response, function() {
        SettingsListener.getSettingsLock().set({
          'findmydevice.registered': true
        });
      });
    }, this._handleServerError.bind(this));
  },

  _scheduleAlarm: function fmd_schedule_alarm(mode) {
    var self = this;
    var nextAlarm = new Date();

    if (mode === 'ping') {
      // this is just a regular ping to the server to make
      // sure we're still registered, so use a long interval
      nextAlarm.setHours(nextAlarm.getHours() + 6);
    } else if (mode === 'retry') {
      // something went wrong when registering or talking to the
      // server, we should check back shortly
      var interval = 1 + Math.floor(5 * Math.random());
      nextAlarm.setMinutes(nextAlarm.getMinutes() + interval);
    } else {
      dump('invalid alarm mode!');
      return;
    }

    if (this._alarmId !== null) {
      this._unscheduleAlarm();
    }

    var data = {type: 'findmydevice-alarm'};
    var request = navigator.mozAlarms.add(nextAlarm, 'honorTimezone', data);

    request.onsuccess = function() {
      self._alarmId = this.result;
    };
  },

  _unscheduleAlarm: function fmd_unschedule_alarm() {
    if (this._alarmId !== null) {
      navigator.mozAlarms.remove(this._alarmId);
      this._alarmId = null;
    }
  },

  _replyAndFetchCommands: function fmd_reply_and_fetch() {
    if (!this._registered || !this._enabled) {
      return;
    }

    this._reply.has_passcode = this._commands._deviceHasPasscode();
    this._requester.post(
      '/cmd/' + this._state.deviceid,
      this._reply,
      this._processCommands.bind(this),
      this._handleServerError.bind(this));

    this._reply = {};
  },

  _processCommands: function fmd_process_commands(cmdobj) {
    if (!this._enabled || cmdobj === null) {
      return;
    }

    // map server (short) commands to methods in the
    // commands object.
    var commandsToMethods = {
      't': 'track',
      'e': 'erase',
      'l': 'lock',
      'r': 'ring',
    };

    for (var cmd in cmdobj) {
      if (cmd in commandsToMethods) {
        var args = cmdobj[cmd], cb = this._replyCallback.bind(this, cmd);

        dump('command ' + cmd + ', args ' + JSON.stringify(args));
        this._commands[commandsToMethods[cmd]](args, cb);
      } else {
        this._replyCallback(cmd, false, 'command not available');
      }
    }

    this._scheduleAlarm('ping');
  },

  _handleServerError: function fmd_handle_server_error(err) {
    dump('findmydevice request failed with status: ' + err.status);
    if (err.status === 401 && this._registered) {
      SettingsListener.getSettingsLock().set({
        'findmydevice.registered': false
      });
    } else {
      this._scheduleAlarm('retry');
    }
  },

  _replyCallback: function fmd_reply(cmd, ok, retval) {
    var value = {ok: ok};

    if (cmd === 't' && ok === true && retval !== undefined) {
      value.la = retval.coords.latitude;
      value.lo = retval.coords.longitude;
      value.ti = retval.timestamp;
    } else if (ok === false) {
      value.error = retval;
    }

    this._reply[cmd] = value;
    this._replyAndFetchCommands();
  }
};

navigator.mozL10n.ready(FindMyDevice.init.bind(FindMyDevice));
