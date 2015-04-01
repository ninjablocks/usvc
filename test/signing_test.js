"use strict";
var fs = require('fs');
var usvc = require('../index.js');
var nodeFn = require('when/node');

var debug = require('debug')('test:signing');

var expect = require('chai').expect;
var readFile = nodeFn.lift(fs.readFile);

describe('cloud modelstore', function () {

  var service = usvc.microService({

    // TODO make a test RPC service
    // rpc interface 
    //
    // rpcService: usvc.facets.rpc.jsonServer(['modelStoreService']),
    // modelStoreService: require('../lib/rpc')
  });

  before(function () {
    service.run();
  });

  it('should get a valid response')

});