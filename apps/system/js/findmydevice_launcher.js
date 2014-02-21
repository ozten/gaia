/* global Applications */

'use strict';

function launchFindMyDevice() {
  var manifestURL =
    location.protocol + '//findmydevice.gaiamobile.org' +
    (location.port ? ':' + location.port : '') +
    '/manifest.webapp';

  var app = Applications.getByManifestURL(manifestURL);
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
