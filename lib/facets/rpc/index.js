'use strict';

var JSONRPCServer = require('./JSONRPCServer');
var JSONRPCClient = require('./JSONRPCClient');

module.exports = {
  jsonServer: function(exportedFacets, options) {
    return JSONRPCServer.bind(undefined, exportedFacets, options || {});
  },
  jsonClient: function(options) {
    return JSONRPCClient.bind(undefined, options || {});
  },
};
