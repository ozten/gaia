/*
 * Super basic: A headless app that listens for contacts changes, on change,
 * emits vcard records to a carddav server.
 *
 * Features:
 * - Subscribes to change events
 * - Adds IDs of changed contacts to a queue along with action (create, delete)
 * - processes queue by generating carddav requests for each type
 *   - for create and update, use vcard.js converter
 * - send requests to server immediately - we'll deal with batch strategies
 *   later
 */

'use strict';

var FXA_Sync_Contacts = {
  changes: [],

  init: function() {
    var self = this;
    navigator.mozContacts.oncontactchange = function(event) {
      self.changes.push({
        id: event.contactID,
        reason: event.reason
      });
      setTimeout(self.processChanges.bind(self));
    };
    console.log('** fxa sync init');
  },

  processChanges: function() {
    var change = this.changes.shift();
    if (!change) {
      return;
    }

    // create, update, or remove
    this[change.reason](change.contactID);
  },

  findByID: function(id, callback) {
    var options = {
      filterBy: ['id'],
      filterOp: 'equals',
      filterValue: id
    };
    var req = navigator.mozContacts.find(options);
    req.onsuccess = function(e) {
      if (e.target.result.length) {
        callback(e.target.result[0]);
      }
      callback(null);
    };
    req.onerror = console.error;
  },

  create: function(id) {
    var self = this;
    self.findByID(id, function(contact) {
      console.log('found: ' + JSON.stringify(contact));
    });
  },

  update: function(id) {
    var self = this;
    self.findByID(id, function(contact) {
      console.log('found: ' + JSON.stringify(contact));
    });
  },

  remove: function(id) {
    console.log('remove ' + id);
  }
};

FXA_Sync_Contacts.init();

