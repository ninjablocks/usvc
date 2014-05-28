var debug = require('debug')('usvc:jsonrpc:client');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var whennode = require('when/node');
var jayson = require('jayson');
var json_signing = require('./json_signing');

function JSONRPCClient(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(JSONRPCClient, EventEmitter);

JSONRPCClient.prototype.initialise = function() {
  return when.try(function() {
    // FIXME: support pool of RPC servers
    var serverKey = this.name + ':server';
    var server = this.service.config.get(serverKey);
    if (!server) {
      throw new Error('JSON RPC Client requires configuration at ' + serverKey);
    }

    ['hostname', 'port'].map(function(key) {
      if (!server.hasOwnProperty(key)) {
        throw new Error('JSON RPC Client requires configuration option: ' + key);
      }
    });

    this.signingFunctions = json_signing.getSigningFunctions(this.service, this.name);

    debug(this.name, 'Configuration for JSON RPC Client: ' + server);

    this.client = jayson.client.http(server);
  }.bind(this));
};

JSONRPCClient.prototype.call = function(method) {
  var remoteMethod = this.name + '.' + method;
  var remoteArgs = [].slice.apply(arguments).slice(1);

  return when.try(function() {
    var deferred = when.defer();

    debug('call', method, remoteArgs);

    if (this.signingFunctions) {
      var signedArgs = this.signingFunctions.sign({method: remoteMethod, arguments: remoteArgs});
      remoteArgs = [signedArgs];

      debug('signed', method, remoteArgs);
    }

    this.client.request(remoteMethod, remoteArgs, function(err, value) {
      debug('result', err, value.error, value.result);

      if (err) {
        deferred.reject(err);
      } else if (value.error) {
        deferred.reject(value.error);
      } else {
        deferred.resolve(value.result);
      }
    });

    return deferred.promise;
  }.bind(this));
};

module.exports = JSONRPCClient;
