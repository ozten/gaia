/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

navigator.mozL10n.ready(function PersonaAccountManager() {
  var _ = navigator.mozL10n.get;

  function logoutEverywhere() {
    // communicate to identity.js in the system app via a settings hack
    var settings = window.navigator.mozSettings;
    if (!settings) {
      console.log("ERROR: no mozSettings; persona logout everywhere won't work");
      return;
    }

    settings.createLock().set({
      'identity.logout-everywhere': Date.now()
    }).onerror = function (err) {
      console.log("ERROR: setting identity.logout-everywhere:", String(err));
    };
  }

  var logoutButton = document.getElementById('persona-logout-everywhere');
  if (logoutButton) {
    logoutButton.addEventListener('click', function onLogoutEverywhere(evt) {
      if (window.confirm(_('logoutEverywhereConfirm'))) {
        logoutEverywhere();
      }
    });
  }
});
