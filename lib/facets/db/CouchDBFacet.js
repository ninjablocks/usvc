'use strict';

var debug = require('debug')('usvc:couchdb');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var couchdb = require('then-couchdb');

function CouchDBFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(CouchDBFacet, EventEmitter);

CouchDBFacet.prototype.initialise = function() {
  return when.try(function() {
    var urlKey = this.name + ':url';
    var url = this.service.config.get(urlKey);

    if (!url) {
      throw new Error('CouchDBFacet requires configuration at ' + urlKey);
    }

    debug(this.name, 'Configuration for CouchDBFacet using URL: ' + url);

    this._client = couchdb.createClient(url);

    return when(this._client.info()).then(function(info) {
      debug(this.name, 'Connected to CouchDB and retrieved information', info);
    }.bind(this));
  }.bind(this));
};

CouchDBFacet.prototype.save = function() {
  return when(this._client.save.apply(this._client, arguments));
};

CouchDBFacet.prototype.saveAll = function() {
  return when(this._client.saveAll.apply(this._client, arguments));
};

CouchDBFacet.prototype.get = function() {
  return when(this._client.get.apply(this._client, arguments));
};

CouchDBFacet.prototype.getAll = function() {
  return when(this._client.getAll.apply(this._client, arguments));
};

CouchDBFacet.prototype.view = function() {
  return when(this._client.view.apply(this._client, arguments));
};

module.exports = CouchDBFacet;
