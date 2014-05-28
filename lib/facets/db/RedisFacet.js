'use strict';

var debug = require('debug')('usvc:redis');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var redis = require('then-redis');
var commands = require('then-redis/modules/commands');

function RedisFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(RedisFacet, EventEmitter);

RedisFacet.prototype.initialise = function() {
  return when.try(function() {
    var urlKey = this.name + ':url';
    var url = this.service.config.get(urlKey);

    if (!url) {
      throw new Error('RedisFacet requires configuration at ' + urlKey);
    }

    debug(this.name, 'Configuration for RedisFacet using URL: ' + url);

    this._client = redis.createClient(url);
    var closeErr = new Error('Redis connection closed by remote host (redis server).');
    this._client.on('close', this.emit.bind(this, 'error', closeErr));
    return when(this._client.connect()).then(function() {
      this._bindRedisCommands();
    }.bind(this));
  }.bind(this));
};

RedisFacet.prototype._bindRedisCommands = function() {
  this.client = {};
  for (var key in commands) {
    if (this.client.hasOwnProperty(key)) continue;

    (function(key) {
      this.client[key] = function() {
        return when(this._client[key].apply(this._client, [].slice.apply(arguments))); // convert to when.js promises
      }.bind(this);
    }.bind(this))(key);
  }
};

module.exports = RedisFacet;
