var ExpressFacet = require('./ExpressFacet');

module.exports = {
  express: function(appFactory, options) {
    return ExpressFacet.bind(undefined, appFactory, options || {});
  }
};
