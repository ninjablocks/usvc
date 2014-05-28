'use strict';

var debug = require('debug')('usvc:core');
var when = require('when');
var whenkeys = require('when/keys');

function MicroService(facets) {
  var env = process.env.USVC_CONFIG_ENV || process.env.NODE_ENV || 'development';
  this.config = require('etc')()
    .argv()
    .env('usvc_', '_')
    .file(process.cwd() + '/config/' + env + '.json')
    .file(process.cwd() + '/config/default.json')
    .pkg();

  debug('config', this.config.toJSON());

  this._facets = {};
  for (var name in facets) {
    var constructor = facets[name];

    var facet = new constructor(this, name); // jshint ignore:line

    facet.on('error', this._handleFacetError.bind(this, facet));

    this._facets[name] = facet;
  }

  this.initialiseFacets();
}

MicroService.prototype.initialiseFacets = function() {
  var deferred = when.defer();
  this._initialisers = deferred.promise;

  var initialiserPromises = {};
  for (var name in this._facets) {
    (function(name) {
      var facet = this._facets[name];
      initialiserPromises[name] = when(facet.initialise()).then(function() {
        debug(name, 'Facet \''+name+'\' loaded successfully');
        return this._facets[name];
      }.bind(this), function(err) {
        err.facet = facet;
        throw err;
      }.bind(this));
    }.bind(this))(name);
  }
  deferred.resolve(initialiserPromises);

  return whenkeys.all(initialiserPromises);
};

MicroService.prototype.facet = function(name) {
  return this._initialisers.then(function(initialisers) {
    return initialisers[name];
  });
};

MicroService.prototype.facets = function() {
  var depPromises = [].slice.apply(arguments).map(function(name) {
    return this.facet(name);
  }, this);

  return when.all(depPromises);
};

MicroService.prototype.run = function() {
  whenkeys.all(this._initialisers).done(function(facets) {
    var facetNames = [];
    for (var name in facets) {
      facetNames.push(name);
    }
    debug('run', 'Facets launched:', facetNames);
  }, function(err) {
    console.error('ERROR: Facet', err.facet.name, 'failed to start.');
    console.error(err);
    process.exit(1);
  });
};

MicroService.prototype._handleFacetError = function(facet, err) {
  console.error('ERROR: Facet', facet.name, 'threw a fatal error, exiting.');
  console.error(err);
  process.exit(1);
};

module.exports = function(facets) {
  return new MicroService(facets);
};
