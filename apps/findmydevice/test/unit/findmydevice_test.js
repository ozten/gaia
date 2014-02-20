/* global MocksHelper */
/* global MockPermissionSettings */
/* global MockSettingsListener */
/* global MockDeviceStorage */
/* global MockGeolocation */
/* global FindMyDeviceCommands */

'use strict';

mocha.globals(['FindMyDeviceCommands']);

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_device_storage.js');
require('/shared/test/unit/mocks/mock_geolocation.js');
require('/shared/test/unit/mocks/mock_permission_settings.js');

var mocksForFindMyDevice = new MocksHelper([
  'SettingsListener', 'SettingsURL', 'Audio', 'DeviceStorage', 'Geolocation'
]).init();

suite('FindMyDevice >', function() {
  var realL10n;
  var realPermissionSettings;
  var realMozPower;

  mocksForFindMyDevice.attachTestHelpers();

  var subject;
  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      ready: function(callback) {
        callback();
      }
    };

    realPermissionSettings = navigator.mozPermissionSettings;
    navigator.mozPermissionSettings = MockPermissionSettings;
    MockPermissionSettings.mSetup();

    navigator.mozPower = {
      factoryResetCalled: false,
      factoryReset: function() {
        this.factoryResetCalled = true;
      }
    };

    require('/js/commands.js', function() {
      subject = FindMyDeviceCommands;
      done();
    });
  });

  test('Lock command', function(done) {
    var code = '1234', message = 'locked!';

    subject.lock({c: code, m: message}, function(retval) {
      assert.equal(retval, true);

      var lock = MockSettingsListener.getSettingsLock().locks.pop();
      assert.deepEqual({
        'lockscreen.enabled': true,
        'lockscreen.notifications-preview.enabled': false,
        'lockscreen.passcode-lock.enabled': true,
        'lockscreen.lock-message': message,
        'lockscreen.passcode-lock.code': code,
        'lockscreen.lock-immediately': true
      }, lock, 'check that the correct settings were set');

      done();
    });
  });

  test('Ring command', function(done) {
    var duration = 2;
    var ringtone = 'user selected ringtone';

    MockSettingsListener.mCallbacks['dialer.ringtone'](ringtone);

    subject.ring({d: duration}, function(retval) {
      var lock = MockSettingsListener.getSettingsLock().locks.pop();

      var channel = subject._ringer.mozAudioChannel;
      assert.equal(channel, 'content', 'use content channel');
      assert.equal(lock['audio.volume.content'], 15, 'volume set to maximum');
      assert.equal(subject._ringer.paused, false, 'must be playing');
      assert.equal(subject._ringer.src, ringtone, 'must use ringtone');

      setTimeout(function() {
        assert.equal(subject._ringer.paused, true, 'must have stopped');
        done();
      }, duration * 1000);
    });
  });

  test('Erase command', function(done) {
    subject.erase({}, function(retval, error) {
      for (var i = 0; i < MockDeviceStorage.instances.length; i++) {
        // check that we deleted everything on the device storage
        assert.deepEqual(MockDeviceStorage.instances[i].entries, []);
      }

      assert.equal(navigator.mozPower.factoryResetCalled, true);
      done();
    });
  });

  test('Track command', function(done) {
    // mock the result of mozApps.getSelf()
    subject._app = {
      manifestURL: 'app://findmydevice.gaiamobile.org/manifest.webapp',
      origin: 'app://findmydevice.gaiamobile.org/'
    };

    // we want to make sure this is set to 'allow'
    MockPermissionSettings.permissions.geolocation = 'deny';

    // XXX the duration argument is ignored if nonzero for now
    var times = 0;
    subject.track({d: 30}, function(retval, position) {
      assert.equal(retval, true);
      assert.equal(MockPermissionSettings.permissions.geolocation, 'allow');
      assert.equal(position.coords.latitude, MockGeolocation.latitude);
      assert.equal(position.coords.longitude, MockGeolocation.longitude);

      if (times++ === 3) {
        // stop tracking after a few positions
        subject.track({d: 0}, function(retval) {
          assert.equal(retval, true);
          assert.deepEqual(MockGeolocation.activeWatches, []);
          done();
        });
      }
    });
  });

  teardown(function() {
    navigator.mozL10n = realL10n;

    MockPermissionSettings.mTeardown();
    navigator.mozPermissionSettings = realPermissionSettings;

    navigator.mozPower = realMozPower;
  });
});
