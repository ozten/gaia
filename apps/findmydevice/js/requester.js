/* global hawk */
/* global SettingsListener */
/* exported FindMyDeviceRequester */

'use strict';

var FindMyDeviceRequester = {
  _url: null,

  _hawkCredentials: null,

  API_URL_SETTING: 'findmydevice.api_url',

  API_VERSION_SETTING: 'findmydevice.api_version',

  init: function fmdr_init() {
    var self = this;

    var baseURL = '', version = '';
    var urlreq = SettingsListener.getSettingsLock().get(this.API_URL_SETTING);
    urlreq.onsuccess = function fmdr_api_url_onsuccess() {
      baseURL = this.result[self.API_URL_SETTING];
      self._url = baseURL + '/' + version;
    };

    var vreq = SettingsListener.getSettingsLock().get(this.API_VERSION_SETTING);
    vreq.onsuccess = function fmdr_api_version_onsuccess() {
      version = this.result[self.API_VERSION_SETTING];
      self._url = baseURL + '/' + version;
    };
  },

  setHawkCredentials: function fmdr_set_hawk_credentials(id, key) {
    this._hawkCredentials = {
      id: id,
      key: key,
      algorithm: 'sha256'
    };
  },

  post: function fmdr_post(url, data, onsuccess, onerror) {
    url = this._url + url;
    data = JSON.stringify(data);

    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');

    var hawkHeader = null;
    if (this._hawkCredentials) {
      var hawkOptions = {
        credentials: this._hawkCredentials,
        contentType: 'application/json',
        payload: data
      };

      hawkHeader = hawk.client.header(url, 'POST', hawkOptions);
      xhr.setRequestHeader('Authorization', hawkHeader.field);
    }

    xhr.onload = function fmdr_xhr_onload() {
      var valid = true;
      if (hawkHeader !== null) {
        valid = hawk.client.authenticate(
          xhr, this._hawkCredentials, hawkHeader.artifacts,
          {payload: xhr.response});
      }

      if (!valid) {
        console.log('findmydevice ignoring response, HAWK failed!');
        return;
      }

      if (xhr.status == 200 && onsuccess) {
        onsuccess(JSON.parse(xhr.response));
      } else if (xhr.status !== 200 && onerror) {
        onerror(xhr);
      }
    };

    xhr.onerror = function fmd_xhr_onerror() {
      if (onerror) {
        onerror(xhr);
      }
    };

    xhr.send(data);
  }
};

navigator.mozL10n.ready(FindMyDeviceRequester.init.bind(FindMyDeviceRequester));
