'use strict';

var AMQPFacet = require('./AMQPFacet');

module.exports = {
  amqp: function() {
    return AMQPFacet;
  },
};
