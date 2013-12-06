'use strict';

marionette('Find My Device lock >', function() {
  var assert = require('assert');
  var System = require('./lib/system.js');

  var FINDMYDEVICE_TEST_APP = 'app://findmydevice-test.gaiamobile.org';

  var client = marionette.client({
    prefs: {
      'dom.inter-app-communication-api.enabled': true
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
  });
  var sys = new System(client);

  var testApp;
  setup(function() {
    testApp = sys.waitForLaunch(FINDMYDEVICE_TEST_APP);
  });

  test('Lock the screen through the test app', function() {
    client.apps.switchToApp(FINDMYDEVICE_TEST_APP);

    var messageText = 'This phone is lost.';
    var messageInput = client.findElement('input[name="message"]');
    messageInput.sendKeys(messageText);

    var passcode = '4567';
    var passcodeInput = client.findElement('input[name="code"]');
    passcodeInput.sendKeys(passcode);

    var lockButton = client.findElement('#lock');
    lockButton.click();

    client.switchToFrame();
    var lockscreen = client.findElement('#lockscreen');
    client.waitFor(function() {
      return lockscreen.displayed();
    });

    var lockscreenMessage = client.findElement('#lockscreen-message');
    assert.equal(lockscreenMessage.text(), messageText);

    var settings = {
      'lockscreen.enabled': true,
      'lockscreen.passcode-lock.enabled': true,
      'lockscreen.notifications-preview.enabled': false,
      'lockscreen.lock-message': messageText,
      'lockscreen.passcode-lock.code': passcode
    };

    for (var s in settings) {
      assert.equal(client.settings.get(s), settings[s]);
    }
  });
});
