'use strict';

var RedisFacet = require('./RedisFacet');
var MySQLPoolFacet = require('./MySQLPoolFacet');
var CouchDBFacet = require('./CouchDBFacet');

module.exports = {
  redis: function() {
    return RedisFacet;
  },
  mysqlPool: function() {
    return MySQLPoolFacet;
  },
  couchdb: function() {
  	return CouchDBFacet;
  },
};
