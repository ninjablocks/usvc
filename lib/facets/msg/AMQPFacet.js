'use strict';

var debug = require('debug')('usvc:amqp');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var amqp = require('amqplib');

var svcs = require('svcs');

function AMQPFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(AMQPFacet, EventEmitter);

AMQPFacet.prototype.initialise = function() {
  return when.try(function() {
    var urlKey = this.name + ':url';
    var url = this.service.config.get(urlKey);

    if (!url) {
      throw new Error('AMQPFacet requires configuration at ' + urlKey);
    }

    debug(this.name, 'Configuration for AMQPFacet using URL: ' + url);

    var closeErr = new Error('AMQP connection closed by remote host (AMQP server).');
    var routerErr = new Error('Error in router acting on AMQP connection.');

    this.svcs_container = svcs();

    return when(amqp.connect(url)).then(function(db) {
      this._db = db;
      db.on('error', this.emit.bind(this, 'error', closeErr));

      this.svcs_container.set('amqpConnection', db);
      this.svcs_container.set('errorHandler', this.emit.bind(this, 'error', routerErr));

      return db;
    }.bind(this));
  }.bind(this));
};

// borrowed from https://github.com/wolfeidau/svcs/blob/master/lib/route/index.js
AMQPFacet.prototype.route = function(route, options, handler) {
  return this.svcs_container.route(route, options, function(msg) {
    when.try(function() {
      return handler(msg);
    }).done(function() {
      msg.ack();
    }, function(err) {
      debug('error', 'Error thrown in routing handler, not acking message. Error: ', err.stack);
    });
  });
};


module.exports = AMQPFacet;
