'use strict';

window.onload = function() {
  var systemPort = null;
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    app.connect('findmydevicetestcomms').then(function(ports) {
      if (ports.length !== 1) {
        console.error('got more than one connection?');
        return;
      }

      systemPort = ports[0];
    }, function(err) {
      console.error('failed to connect: ' + err);
    });
  };

  var buttons = document.getElementsByTagName('button');
  for (var i = 0; i < buttons.length; i++) {
    (function (command) {
      buttons[i].addEventListener('click', function() {
        var cmdobj = {};
        cmdobj[command] = {};

        var options = document.getElementsByTagName('input');
        for (var i = 0; i < options.length; i++) {
          cmdobj[command][options[i].name[0]] = options[i].value;
        }

        systemPort.postMessage(cmdobj);
      });
    })(buttons[i].textContent[0].toLowerCase());
  }
};
