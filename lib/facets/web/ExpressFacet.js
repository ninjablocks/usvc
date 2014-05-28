'use strict';

var debug = require('debug')('usvc:express');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');

function ExpressFacet(appFactory, options, service, name) {
  this.appFactory = appFactory;
  this.options = options || {};
  this.service = service;
  this.name = name;
}
util.inherits(ExpressFacet, EventEmitter);

ExpressFacet.prototype.initialise = function() {
  return when.try(function() {
    var portKey = this.name + ':port';
    var port = this.service.config.get(portKey);

    if (!port) {
      throw new Error('ExpressFacet requires configuration at ' + portKey);
    }

    debug(this.name, 'Configuration for ExpressFacet using port: ' + port);

    var deferred = when.defer();

    var appPromise = when.try(this.appFactory.bind(this, this._setupExpress.bind(this)));
    appPromise.then(function(app) {
      app.listen(port, function() {
        deferred.resolve(app);
      }.bind(this));
    }.bind(this));

    return deferred.promise;
  }.bind(this));
};

ExpressFacet.prototype._setupExpress = function(app) {
  app.set('facet', this);
  app.set('service', this.service);
};

module.exports = ExpressFacet;
