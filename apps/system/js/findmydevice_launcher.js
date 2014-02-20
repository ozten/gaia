/* global Applications */

'use strict';

function launchFindMyDevice() {
  var app = Applications.getByManifestURL(
    location.protocol + '//findmydevice.gaiamobile.org/manifest.webapp');
  app.launch();
}

if (Applications.ready) {
  launchFindMyDevice();
} else {
  window.addEventListener('applicationready', function onAppReady() {
    window.removeEventListener('applicationready', onAppReady);
    launchFindMyDevice();
  });
}
