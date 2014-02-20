/* global SettingsURL */
/* global SettingsListener */
/* global dump */

'use strict';

var FindMyDeviceCommands = {
  _ringer: null,

  _ringtoneURL: null,

  _watchId: null,

  _app: null,

  _lockscreenEnabled: false,

  _lockscreenPassCodeEnabled: false,

  init: function fmdc_init() {
    var self = this;

    this._ringer = new Audio();
    this._ringer.mozAudioChannel = 'content';
    this._ringer.loop = true;

    this._ringtoneURL = new SettingsURL();
    SettingsListener.observe('dialer.ringtone', '', function(value) {
      var ringing = !self._ringer.paused;

      self._ringer.pause();
      self._ringer.src = self._ringtoneURL.set(value);
      if (ringing) {
        self._ringer.play();
      }
    });

    SettingsListener.observe('lockscreen.enabled', false, function(value) {
      self._lockscreenEnabled = value;
    });

    SettingsListener.observe('lockscreen.passcode-lock.enabled', false,
      function(value) {
        self._lockscreenPassCodeEnabled = value;
      }
    );

    this._app = null;
    var appreq = navigator.mozApps.getSelf();
    appreq.onsuccess = function fmdc_getapp_success() {
      self._app = this.result;
    };

    appreq.onerror = function fmdc_getapp_error() {
      dump('failed to grab reference to app!');
    };
  },

  _deviceHasPasscode: function fmdc_device_has_passcode() {
    return this._lockscreenEnabled && this.lockscreenPassCodeEnabled;
  },

  _setPermission: function fmdc_set_permission(permission, value) {
    if (!this._app) {
      return false;
    }

    try {
      navigator.mozPermissionSettings.set(
        permission, value, this._app.manifestURL, this._app.origin, false);
    } catch (exc) {
      return false;
    }

    return true;
  },

  track: function fmdc_track(args, reply) {
    var duration = parseInt(args.d, 10);

    // XXX we actually ignore nonzero durations for the
    // time being.

    if (this._watchId !== null) {
      if (duration === 0) {
        // stop tracking
        navigator.geolocation.clearWatch(this._watchId);
        this._watchId = null;
      }

      reply(true);
      return;
    }

    if (!navigator.mozPermissionSettings) {
      reply(false, 'mozPermissionSettings is missing');
      return;
    }

    if (!this._setPermission('geolocation', 'allow')) {
      reply(false, 'failed to set geolocation permission!');
      return;
    }

    this._watchId = navigator.geolocation.watchPosition(
      function fmdc_watchposition_success(position) {
        dump('updating location to (' +
          position.coords.latitude + ', ' +
          position.coords.longitude + ')'
        );

        reply(true, position);
      }, function fmdc_watchposition_error(error) {
        reply(false, 'failed to get location: ' + error.message);
      }
    );
  },

  erase: function fmdc_erase(args, reply) {
    var wiped = 0;
    var toWipe = ['apps', 'pictures', 'sdcard', 'videos', 'music'];

    function cursor_onsuccess(target, ds) {
      return function() {
        var file = this.result;

        if (file) {
          ds.delete(file.name);
        }

        if (!this.done) {
          this.continue();
        } else {
          dump('done wiping ' + target);
          if (++wiped == toWipe.length) {
            dump('all targets wiped, starting factory reset!');
            navigator.mozPower.factoryReset();
            reply(true); // testing only
          }
        }
      };
    }

    function cursor_onerror(target) {
      return function() {
        dump('wipe failed to acquire cursor for ' + target);
        wiped++;
      };
    }

    for (var i = 0; i < toWipe.length; i++) {
      var ds = navigator.getDeviceStorage(toWipe[i]);
      var cursor = ds.enumerate();
      cursor.onsuccess = cursor_onsuccess(toWipe[i], ds);
      cursor.onerror = cursor_onerror(toWipe[i]);
    }
  },

  lock: function fmdc_lock(args, reply) {
    var message = args.m, passcode = args.c;

    var settings = {
      'lockscreen.enabled': true,
      'lockscreen.notifications-preview.enabled': false,
      'lockscreen.passcode-lock.enabled': true,
      'lockscreen.lock-immediately': true
    };

    if (message) {
      settings['lockscreen.lock-message'] = message;
    }

    if (!this._deviceHasPasscode() && passcode) {
      settings['lockscreen.passcode-lock.code'] = passcode;
    }

    SettingsListener.getSettingsLock().set(settings).onsuccess = function() {
      reply(true);
    };
  },

  ring: function fmdc_ring(args, reply) {
    var self = this;
    var duration = parseInt(args.d, 10);

    function stop() {
      self._ringer.pause();
      self._ringer.currentTime = 0;
    }

    // are we already ringing?
    if (!this._ringer.paused) {
      if (duration === 0) {
        stop();
      }

      reply(true);
      return;
    }

    SettingsListener.getSettingsLock().set({
      // hard-coded max volume taken from
      // https://wiki.mozilla.org/WebAPI/AudioChannels
      'audio.volume.content': 15
    }).onsuccess = function() {
      self._ringer.play();
      reply(true);
    };

    // use a minimum duration if the value we received is invalid
    duration = (isNaN(duration) || duration <= 0) ? 1 : duration;
    setTimeout(stop, duration * 1000);
  }
};

navigator.mozL10n.ready(FindMyDeviceCommands.init.bind(FindMyDeviceCommands));
