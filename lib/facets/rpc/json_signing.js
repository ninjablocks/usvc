var when = require('when');
var jwt = require('jsonwebtoken');

module.exports.getSigningFunctions = function(service, facetName) {
  var signingKey = facetName + ':signing';
  var signingOptions = service.config.get(signingKey);
  if (!signingOptions) {
    throw new Error('JSON RPC Client requires configuration of signing at ' + signingKey);
  }

  if (!signingOptions.hasOwnProperty('sign')) {
    throw new Error('JSON RPC Client requires explicit selection of signing, to disable use {sign: false}');
  }

  if (!signingOptions.sign) {
    return null;
  }

  if (signingOptions.sign && !signingOptions.hasOwnProperty('secret')) {
    // TODO: add support for public/private key files as alternate config options
    throw new Error('JSON RPC Client with signing enabled requires a signing secret to be specified');
  }

  return {
    sign: function(payload) {
      return jwt.sign(payload, signingOptions.secret);
    },
    verify: function(encoded) {
      var deferred = when.defer();

      jwt.verify(encoded, signingOptions.secret, function(err, decoded) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(decoded);
        }
      });

      return deferred.promise;
    }
  };
};
