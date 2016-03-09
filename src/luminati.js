// luminati.js
var Promise = require('bluebird');
var lookup = Promise.promisify(require('dns').lookup);

// This just creates a random number.
function _makeSessionId() {
  var date = '' + Date.now();
  return date + Math.floor(Math.random() * 10000000)
}


// Creates the string for the super-proxy domain to be looked up.
// We send a new session id in order to get a new super proxy.
function _getDomain (session_id, country) {
  return `servercountry-${country}-session-${session_id}.zproxy.luminati.io`
}

// Keeps track of latest IP for super proxy to use.
function _host (interval, cache, country) {
  var host = false;
  var stopInterval;
  // periodically resolve DNS fom zproxy, which will
  // give their currently fastest super proxies.
  // This also means we don't perform this DNS resolution
  // at call time.

  if (cache) {
    stopInterval = setInterval(() => {
      var id = _makeSessionId();
      lookup(_getDomain(id, country))
        .then(_host => {
          host = _host;
        })
    }, interval);
  };

  return {

    // get takes the current session id and returns either the
    // current host, if we hav already resolved one, or resolves
    // one asynchronously if we don't yet have one.
    get: function get (id) {
      if (host) {
        return Promise.resolve(host);
      };

      var domain = _getDomain(id, country);
      if (!cache) {
        return Promise.resolve(domain);
      };
      return lookup(domain)
        .then(_host => {
          host = _host;
          return _host;
        });
    },
    cleanup: clearInterval.bind(null, stopInterval)
  };
};

/**
 * @typedef {Object} LuminatiConfig
 * @property {String} username luminati username in the form USER-zone-ZONE
 * @property {String} password luminati password
 * @property {String} [superProxyLocation = gb] country code to use for super proxy location.
 * @property {String} [exitLocation = false] country code if you want exit node to be in a specific
 * country. If not provided, will provide exit nodes in random countries.
 * @property {String} [dnsResolution = local] can be 'local' or 'remote' - where the final
 * url should have its DNS resolved, locally at the super proxy, or remotes at the exit node.
 * @property {Boolean} [https = false] whether you want to use an https proxy url or not.
 * @property {Boolean} [cacheSuperProxy = false] whether or not to perform DNS lookup of
 * super proxy and cache result. Automatically turned off when https is true.
 * @property {Number} [cacheTimeout = 60000] frequency, in ms, that you want to refresh the
 * cache of the super-proxy DNS, ignored if cacheSuperProxy is set to false or https is set
 * to true.
 */


/**
 * Luminati!!
 * @constructor
 * @param {LuminatiConfig} config
 *
 *
 */
function Luminati (config) {
  this.port = 22225;
  this.dns = config.dnsResolution == 'remote' ? 'dns-remote' : 'dns-local';
  this.password = config.password;
  this.spCountry = config.superProxyLocation || 'gb';
  this.country = config.exitLocation ? `-country-${config.exitLocation}` : '';
  this.user = `lum-customer-${config.username}${this.country}-${this.dns}`;
  this.s = config.https ? 's' : '';
  this.cacheSuperProxy = this.s ? false : config.cacheSuperProxy;

  // Set the super proxy host to redo DNS lookup every 60 seconds.
  var refresh = config.cacheTimeout || 60000;
  this.host = _host(refresh, this.cacheSuperProxy, this.spCountry);
}

Luminati.prototype._makeProxyString = function (host, id) {
  return `http${this.s}://${this.user}-session-${id}:${this.password}@${host}:${this.port}`
}

/**
 * getProxy is what you call every time you need a new exit node.
 * @function
 * @returns {Promise} Returns promise that resolves with string to use as proxy in your
 * net requests.
 * Note: this promise will perform a DNS lookup the first time it is called, but after
 * should resolve immediately. This is the entire string used as "host" when
 * making http requests!
 *
 * @example

var request = require('request');
var Luminati = require('luminati');

var luminati = new Luminati({
  username: 'myusername-zone-myzone',
  password: 'mypassword'
});

luminati.getProxy().then(proxy => {
  request({ url: 'http://coolurl.com', proxy: proxy })
   .pipe(toWherever)
});

 */
Luminati.prototype.getProxy = function () {
  var self = this;
  var id = _makeSessionId();
  return this.host.get(id)
    .then(host => self._makeProxyString(host, id))
}



/******************* EXPORTS **************************
******************************************************/
module.exports = {
  _makeSessionId: _makeSessionId,
  _host: _host,
  Luminati: Luminati
}
