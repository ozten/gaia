/* global SettingsListener */

'use strict';

var FindMyDevice = {
  _api: null,
  _personaIframe: null,

  init: function fmd_init() {
    var self = this;

    var lock = SettingsListener.getSettingsLock();
    lock.get('findmydevice.api_url').onsuccess = function() {
      self._api = this.result['findmydevice.api_url'];
    };

    SettingsListener.observe('findmydevice.enabled', false,
      this._setEnabled.bind(this));
    SettingsListener.observe('findmydevice.registered', false,
      this._setRegistered.bind(this));

    var loginButton = document.getElementById('findmydevice-login');
    loginButton.addEventListener('click', this._requestLogin.bind(this));

    var checkbox = document.querySelector('#findmydevice-enabled input');
    checkbox.addEventListener('change', this._onCheckboxChanged.bind(this));

    window.addEventListener('message', this._onAssertionObtained.bind(this));
  },

  _setEnabled: function fmd_set_enabled(value) {
    var _ = navigator.mozL10n.get;

    var desc = document.getElementById('findmydevice-desc');
    desc.textContent = value ? _('enabled') : _('disabled');

    var checkbox = document.querySelector('#findmydevice-enabled input');
    checkbox.checked = value;
    checkbox.disabled = false;
  },

  _setRegistered: function fmd_set_registered(value) {
    var signin = document.getElementById('findmydevice-signin');
    signin.hidden = value;

    var settings = document.getElementById('findmydevice-settings');
    settings.hidden = !value;
  },

  _requestLogin: function fmd_requestLogin() {
    if (this._personaIframe !== null) {
      return;
    }

    this._personaIframe = document.createElement('iframe');
    this._personaIframe.src = this._api + '/static/persona_iframe.html';
    document.body.appendChild(this._personaIframe);
  },

  _onCheckboxChanged: function fmd_on_checkbox_changed() {
      var checkbox = document.querySelector('#findmydevice-enabled input');

      SettingsListener.getSettingsLock().set({
        'findmydevice.enabled': checkbox.checked
      }).onerror = function() {
        checkbox.disabled = false;
      };

      checkbox.disabled = true;
  },

  _onAssertionObtained: function fmd_on_assertion_obtained(event) {
    document.body.removeChild(this._personaIframe);
    this._personaIframe = null;

    if (!event.data) {
      return;
    }

    SettingsListener.getSettingsLock().set({
      'findmydevice.assertion': event.data
    });

    SettingsListener.getSettingsLock().set({
      'findmydevice.enabled': true
    });
  },
};

navigator.mozL10n.ready(FindMyDevice.init.bind(FindMyDevice));
