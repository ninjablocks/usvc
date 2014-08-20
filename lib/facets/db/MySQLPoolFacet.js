'use strict';

var debug = require('debug')('usvc:mysql');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var whennode = require('when/node');

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
  var deferred = when.defer();

  this.pool.getConnection(function(err, connection) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(true);
      connection.release();
      return this.client;
    }
  }.bind(this));

  return deferred.promise;
};

MySQLFacet.prototype.query = function(query, values) {
  var deferred = when.defer();

  values = values || [];

  this.pool.query(query, values, function(err, results) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(results);
    }
  }.bind(this));

  return deferred.promise;
};

/** 
 * Calls the specified queryFunc with a promisified connection that is
 * already set up in a transaction. The function should return a promise
 * of the completion of a set of queries to run inside the transaction.
 *
 * If the query promise resolves, the transaction is committed, otherwise
 * it is rolled back.
 *
 * This function itself returns another promise that resolves if the
 * transaction was committed successfully, or rejects with any error
 * that occurred through the whole process.
 *
 * The connection will be automatically returned to the pool once complete.
 */
MySQLFacet.prototype.transaction = function(queryFunc) {
  var deferred = when.defer();

  this.pool.getConnection(function(err, connection) {
    if (err) {
      return deferred.reject(err);
    }

    var whenConn = {
      query: whennode.lift(connection.query.bind(connection)),
      beginTransaction: whennode.lift(connection.beginTransaction.bind(connection)),
      commit: whennode.lift(connection.commit.bind(connection)),
      rollback: whennode.lift(connection.rollback.bind(connection)),
    };
    var queriesCalled = whenConn.beginTransaction().then(function() {
      return when.try(queryFunc, whenConn);
    });

    var transactionHandled = queriesCalled.then(function() {
      // successfully queried = commit
      debug('transaction', 'commit');
      return whenConn.commit();
    }, function(err) {
      // error = rollback
      debug('transaction', 'rollback', err);
      return whenConn.rollback();
    });

    // release the connection since at this point, we're done with it in any case.
    var cleanedUp = transactionHandled.finally(function() {
      connection.release();
    });

    // finally, proxy out the final state to the deferred
    cleanedUp.done(function() {
      deferred.resolve(null);
    }, function(err) {
      deferred.reject(err);
    });
  });

  return deferred.promise;
};

module.exports = MySQLFacet;
