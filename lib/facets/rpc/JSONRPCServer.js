'use strict';

var debug = require('debug')('usvc:jsonrpc:server');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var jayson = require('jayson');
var flat = require('flat');
var json_signing = require('./json_signing');

var express = require('express');
var bodyParser = require('body-parser');

function JSONRPCServer(exportedFacets, options, service, name) {
  this.exportedFacets = exportedFacets;
  this.options = options || {};
  this.service = service;
  this.name = name;
}
util.inherits(JSONRPCServer, EventEmitter);

JSONRPCServer.prototype.initialise = function() {
  var dependencies = this.service.facets.apply(this.service, this.exportedFacets);

  return dependencies.then(function(exportedFacets) {
    var methods = {};

    exportedFacets.map(function(facet) {
      var flattened = flat.flatten(facet.rpc_methods);

      for (var name in flattened) {
        methods[facet.name + '.' + name] = flattened[name].bind(facet);
      }
    }.bind(this));

    this.methods = methods;
    debug('export', this.methods);

    return this._setupServer();
  }.bind(this));
};

JSONRPCServer.prototype._setupServer = function() {
  return when.try(function() {
    var portKey = this.name + ':port';
    var port = this.service.config.get(portKey);

    if (!port) {
      throw new Error('JSON RPC Client requires configuration at ' + portKey);
    }

    this.signingFunctions = json_signing.getSigningFunctions(this.service, this.name);

    var hostKey = this.name + ':host';
    var host = this.service.config.get(hostKey);

    var wrappedMethods = {};
    for (var name in this.methods) {
      if (!this.methods.hasOwnProperty(name)) continue;
      var method = this.methods[name];

      (function(name, method) {
        wrappedMethods[name] = function() {
          var args = [].slice.apply(arguments);
          var callback = args.pop();

          debug('call', args);

          var argsPromise;

          if (this.signingFunctions) {
            argsPromise = this.signingFunctions.verify(args[0]).then(function(decoded) {
              if (decoded.method != name) {
                throw {code:403, message:'Method name mismatch during signature verification'};
              }
              debug('verified', decoded.method, decoded.arguments);
              return decoded.arguments;
            }, function() {
              throw {code:403, message:'Verification of signed message failed'};
            });
          } else {
            argsPromise = when(args);
          }

          // promisify the maybe-promise result
          var promise = argsPromise.then(function(args) {
            return when.try(function() {
              return method.apply(this, args);
            }.bind(this));
          }.bind(this));

          // wrap back out to node callback style
          promise.done(function(val) {
            debug('result', val);
            callback(null, val);
          }, function(err) {
            debug('error', err.stack);
            // must be the correct format, check for node Errors and
            // magicify into {code: ..., message: ...}
            if (err.hasOwnProperty('message')) {
              callback(err);
            } else {
              callback({message: err.toString()});
            }
          });
        }.bind(this);
      }.bind(this))(name, method);
    }

    var portKey = this.name + ':port';
    var port = this.service.config.get(portKey);

    this.server = jayson.server(wrappedMethods);
    var app = express();

    var deferred = when.defer();
    var args = [port];

    if (host) {
      args.push(host);
    }

    args.push(function(err) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(true);
      }
    });

    app.use(bodyParser.json());

    app.get('/status', function (req, res) {
      res.status(200).send({status: 'ok'});
    });

    app.use(this.server.middleware());

    app.listen(port, function() {
      debug(this.name, 'Listening on ' + port);
      deferred.resolve(app);
    }.bind(this));

    return deferred.promise;
  }.bind(this));
};

JSONRPCServer.prototype.call = function(method) {
  var remoteArgs = [].slice.apply(arguments).slice(1);

  return this.methods[method].apply(undefined, remoteArgs);
};

module.exports = JSONRPCServer;
