/* global SettingsListener */

'use strict';

var FindMyDevice = {
  _personaIframe: null,

  init: function fmd_init() {
    var self = this;
    var _ = navigator.mozL10n.get;
    console.log('initializing findmydevice');

    SettingsListener.observe('findmydevice.enabled', false, function(value) {
      console.log('findmydevice.enabled = ' + value);

      var desc = document.getElementById('findmydevice-desc');
      desc.textContent = value ? _('enabled') : _('disabled');

      var chbox = document.querySelector('#findmydevice-enabled input');
      chbox.checked = value;
      chbox.disabled = false;
    });

    SettingsListener.observe('findmydevice.registered', false, function(value) {
      var signin = document.getElementById('findmydevice-signin');
      signin.hidden = value;

      var settings = document.getElementById('findmydevice-settings');
      settings.hidden = !value;
    });

    var api = null;
    var lock = SettingsListener.getSettingsLock();
    lock.get('findmydevice.api_url').onsuccess = function() {
      api = this.result['findmydevice.api_url'];
    };

    window.addEventListener('message', function(event) {
      document.body.removeChild(self._personaIframe);
      self._personaIframe = null;

      if (!event.data) {
        return;
      }

      SettingsListener.getSettingsLock().set({
        'findmydevice.assertion': event.data
      });

      SettingsListener.getSettingsLock().set({
        'findmydevice.enabled': true
      });
    }, false);

    var loginButton = document.getElementById('findmydevice-login');
    loginButton.addEventListener('click', function() {
      if (self._personaIframe !== null) {
        return;
      }

      self._personaIframe = document.createElement('iframe');
      self._personaIframe.src = api + '/static/persona_iframe.html';
      console.log(self._personaIframe.src);
      document.body.appendChild(self._personaIframe);
    });

    var chbox = document.querySelector('#findmydevice-enabled input');
    chbox.onchange = function fmd_toggle() {
      SettingsListener.getSettingsLock().set({
        'findmydevice.enabled': this.checked
      }).onerror = function() {
        chbox.disabled = false;
      };

      this.disabled = true;
    };
  }
};

navigator.mozL10n.ready(FindMyDevice.init.bind(FindMyDevice));
