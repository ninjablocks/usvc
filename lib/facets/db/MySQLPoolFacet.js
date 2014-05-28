'use strict';

var debug = require('debug')('usvc:mysql');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');

var mysql = require('mysql');

function MySQLFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(MySQLFacet, EventEmitter);

MySQLFacet.prototype.initialise = function() {
  return when.try(function() {
    var urlKey = this.name + ':url';
    var url = this.service.config.get(urlKey);

    if (!url) {
      throw new Error('MySQLFacet requires configuration at ' + urlKey);
    }

    debug(this.name, 'Configuration for MySQLFacet using URL: ' + url);

    this.pool = mysql.createPool(url);
    return when(this._connect_promise());
  }.bind(this));
};

MySQLFacet.prototype._connect_promise = function() {
  var defer = when.defer();

  this.pool.getConnection(function(err, connection) {
    if (err) {
      defer.reject(err);
    } else {
      defer.resolve(true);
      connection.release();
      return this.client;
    }
  }.bind(this));

  return defer.promise;
};

MySQLFacet.prototype.query = function(query, values) {
  var defer = when.defer();

  values = values || [];

  this.pool.query(query, values, function(err, results) {
    if (err) {
      defer.reject(err);
    } else {
      defer.resolve(results);
    }
  }.bind(this));

  return defer.promise;
};

module.exports = MySQLFacet;
