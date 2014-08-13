'use strict';

var debug = require('debug')('usvc:express');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var timing  = require('timing-middleware');

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

    var appPromise = when.try(this.appFactory.bind(this), this._setupExpress.bind(this));
    return appPromise.then(function(app) {
      var deferred = when.defer();

      app.listen(port, function() {
        debug(this.name, 'Listening on ' + port);
        deferred.resolve(app);
      }.bind(this));

      return deferred.promise;
    }.bind(this));
  }.bind(this));
};

ExpressFacet.prototype._setupExpress = function(app) {
  app.set('facet', this);
  app.set('service', this.service);
  app.use(timing(function(verb, path, duration) {
    debug('timing', verb, path, 'took', duration, 'ms');
  }));
};

module.exports = ExpressFacet;
