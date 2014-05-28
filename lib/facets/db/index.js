'use strict';

var RedisFacet = require('./RedisFacet');
var MySQLPoolFacet = require('./MySQLPoolFacet');

module.exports = {
  redis: function() {
    return RedisFacet;
  },
  mysqlPool: function() {
    return MySQLPoolFacet;
  },
};
