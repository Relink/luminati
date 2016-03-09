'use strict';

// luminati.js
var Promise = require('bluebird');
var lookup = Promise.promisify(require('dns').lookup);

// This just creates a random number.
function _makeSessionId() {
  var date = '' + Date.now();
  return date + Math.floor(Math.random() * 10000000);
}

// Creates the string for the super-proxy domain to be looked up.
// We send a new session id in order to get a new super proxy.
function _getDomain(session_id, country) {
  return 'servercountry-' + country + '-session-' + session_id + '.zproxy.luminati.io';
}

// Keeps track of latest IP for super proxy to use.
function _host(interval, cache, country) {
  var host = false;
  var stopInterval;
  // periodically resolve DNS fom zproxy, which will
  // give their currently fastest super proxies.
  // This also means we don't perform this DNS resolution
  // at call time.

  if (cache) {
    stopInterval = setInterval(function () {
      var id = _makeSessionId();
      lookup(_getDomain(id, country)).then(function (_host) {
        host = _host;
      });
    }, interval);
  };

  return {

    // get takes the current session id and returns either the
    // current host, if we hav already resolved one, or resolves
    // one asynchronously if we don't yet have one.
    get: function get(id) {
      if (host) {
        return Promise.resolve(host);
      };

      var domain = _getDomain(id, country);
      if (!cache) {
        return Promise.resolve(domain);
      };
      return lookup(domain).then(function (_host) {
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
function Luminati(config) {
  this.port = 22225;
  this.dns = config.dnsResolution == 'remote' ? 'dns-remote' : 'dns-local';
  this.password = config.password;
  this.spCountry = config.superProxyLocation || 'gb';
  this.country = config.exitLocation ? '-country-' + config.exitLocation : '';
  this.user = 'lum-customer-' + config.username + this.country + '-' + this.dns;
  this.s = config.https ? 's' : '';
  this.cacheSuperProxy = this.s ? false : config.cacheSuperProxy;

  // Set the super proxy host to redo DNS lookup every 60 seconds.
  var refresh = config.cacheTimeout || 60000;
  this.host = _host(refresh, this.cacheSuperProxy, this.spCountry);
}

Luminati.prototype._makeProxyString = function (host, id) {
  return 'http' + this.s + '://' + this.user + '-session-' + id + ':' + this.password + '@' + host + ':' + this.port;
};

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
  return this.host.get(id).then(function (host) {
    return self._makeProxyString(host, id);
  });
};

/******************* EXPORTS **************************
******************************************************/
module.exports = {
  _makeSessionId: _makeSessionId,
  _host: _host,
  Luminati: Luminati
};
//# sourceMappingURL=data:application/json;base64,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RUFBb0I7QUFDeEQsa0JBQWMsS0FBSyxDQUFMLFdBQVksS0FBSyxJQUFMLGlCQUFxQixXQUFNLEtBQUssUUFBTCxTQUFpQixhQUFRLEtBQUssSUFBTCxDQUR0QjtDQUFwQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBNkJ0QyxTQUFTLFNBQVQsQ0FBbUIsUUFBbkIsR0FBOEIsWUFBWTtBQUN4QyxNQUFJLE9BQU8sSUFBUCxDQURvQztBQUV4QyxNQUFJLEtBQUssZ0JBQUwsQ0FGb0M7QUFHeEMsU0FBTyxLQUFLLElBQUwsQ0FBVSxHQUFWLENBQWMsRUFBZCxFQUNKLElBREksQ0FDQztXQUFRLEtBQUssZ0JBQUwsQ0FBc0IsSUFBdEIsRUFBNEIsRUFBNUI7R0FBUixDQURSLENBSHdDO0NBQVo7Ozs7QUFXOUIsT0FBTyxPQUFQLEdBQWlCO0FBQ2Ysa0JBQWdCLGNBQWhCO0FBQ0EsU0FBTyxLQUFQO0FBQ0EsWUFBVSxRQUFWO0NBSEYiLCJmaWxlIjoibHVtaW5hdGkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBsdW1pbmF0aS5qc1xudmFyIFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpO1xudmFyIGxvb2t1cCA9IFByb21pc2UucHJvbWlzaWZ5KHJlcXVpcmUoJ2RucycpLmxvb2t1cCk7XG5cbi8vIFRoaXMganVzdCBjcmVhdGVzIGEgcmFuZG9tIG51bWJlci5cbmZ1bmN0aW9uIF9tYWtlU2Vzc2lvbklkKCkge1xuICB2YXIgZGF0ZSA9ICcnICsgRGF0ZS5ub3coKTtcbiAgcmV0dXJuIGRhdGUgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMClcbn1cblxuXG4vLyBDcmVhdGVzIHRoZSBzdHJpbmcgZm9yIHRoZSBzdXBlci1wcm94eSBkb21haW4gdG8gYmUgbG9va2VkIHVwLlxuLy8gV2Ugc2VuZCBhIG5ldyBzZXNzaW9uIGlkIGluIG9yZGVyIHRvIGdldCBhIG5ldyBzdXBlciBwcm94eS5cbmZ1bmN0aW9uIF9nZXREb21haW4gKHNlc3Npb25faWQsIGNvdW50cnkpIHtcbiAgcmV0dXJuIGBzZXJ2ZXJjb3VudHJ5LSR7Y291bnRyeX0tc2Vzc2lvbi0ke3Nlc3Npb25faWR9Lnpwcm94eS5sdW1pbmF0aS5pb2Bcbn1cblxuLy8gS2VlcHMgdHJhY2sgb2YgbGF0ZXN0IElQIGZvciBzdXBlciBwcm94eSB0byB1c2UuXG5mdW5jdGlvbiBfaG9zdCAoaW50ZXJ2YWwsIGNhY2hlLCBjb3VudHJ5KSB7XG4gIHZhciBob3N0ID0gZmFsc2U7XG4gIHZhciBzdG9wSW50ZXJ2YWw7XG4gIC8vIHBlcmlvZGljYWxseSByZXNvbHZlIEROUyBmb20genByb3h5LCB3aGljaCB3aWxsXG4gIC8vIGdpdmUgdGhlaXIgY3VycmVudGx5IGZhc3Rlc3Qgc3VwZXIgcHJveGllcy5cbiAgLy8gVGhpcyBhbHNvIG1lYW5zIHdlIGRvbid0IHBlcmZvcm0gdGhpcyBETlMgcmVzb2x1dGlvblxuICAvLyBhdCBjYWxsIHRpbWUuXG5cbiAgaWYgKGNhY2hlKSB7XG4gICAgc3RvcEludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgdmFyIGlkID0gX21ha2VTZXNzaW9uSWQoKTtcbiAgICAgIGxvb2t1cChfZ2V0RG9tYWluKGlkLCBjb3VudHJ5KSlcbiAgICAgICAgLnRoZW4oX2hvc3QgPT4ge1xuICAgICAgICAgIGhvc3QgPSBfaG9zdDtcbiAgICAgICAgfSlcbiAgICB9LCBpbnRlcnZhbCk7XG4gIH07XG5cbiAgcmV0dXJuIHtcblxuICAgIC8vIGdldCB0YWtlcyB0aGUgY3VycmVudCBzZXNzaW9uIGlkIGFuZCByZXR1cm5zIGVpdGhlciB0aGVcbiAgICAvLyBjdXJyZW50IGhvc3QsIGlmIHdlIGhhdiBhbHJlYWR5IHJlc29sdmVkIG9uZSwgb3IgcmVzb2x2ZXNcbiAgICAvLyBvbmUgYXN5bmNocm9ub3VzbHkgaWYgd2UgZG9uJ3QgeWV0IGhhdmUgb25lLlxuICAgIGdldDogZnVuY3Rpb24gZ2V0IChpZCkge1xuICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShob3N0KTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBkb21haW4gPSBfZ2V0RG9tYWluKGlkLCBjb3VudHJ5KTtcbiAgICAgIGlmICghY2FjaGUpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShkb21haW4pO1xuICAgICAgfTtcbiAgICAgIHJldHVybiBsb29rdXAoZG9tYWluKVxuICAgICAgICAudGhlbihfaG9zdCA9PiB7XG4gICAgICAgICAgaG9zdCA9IF9ob3N0O1xuICAgICAgICAgIHJldHVybiBfaG9zdDtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBjbGVhbnVwOiBjbGVhckludGVydmFsLmJpbmQobnVsbCwgc3RvcEludGVydmFsKVxuICB9O1xufTtcblxuLyoqXG4gKiBAdHlwZWRlZiB7T2JqZWN0fSBMdW1pbmF0aUNvbmZpZ1xuICogQHByb3BlcnR5IHtTdHJpbmd9IHVzZXJuYW1lIGx1bWluYXRpIHVzZXJuYW1lIGluIHRoZSBmb3JtIFVTRVItem9uZS1aT05FXG4gKiBAcHJvcGVydHkge1N0cmluZ30gcGFzc3dvcmQgbHVtaW5hdGkgcGFzc3dvcmRcbiAqIEBwcm9wZXJ0eSB7U3RyaW5nfSBbc3VwZXJQcm94eUxvY2F0aW9uID0gZ2JdIGNvdW50cnkgY29kZSB0byB1c2UgZm9yIHN1cGVyIHByb3h5IGxvY2F0aW9uLlxuICogQHByb3BlcnR5IHtTdHJpbmd9IFtleGl0TG9jYXRpb24gPSBmYWxzZV0gY291bnRyeSBjb2RlIGlmIHlvdSB3YW50IGV4aXQgbm9kZSB0byBiZSBpbiBhIHNwZWNpZmljXG4gKiBjb3VudHJ5LiBJZiBub3QgcHJvdmlkZWQsIHdpbGwgcHJvdmlkZSBleGl0IG5vZGVzIGluIHJhbmRvbSBjb3VudHJpZXMuXG4gKiBAcHJvcGVydHkge1N0cmluZ30gW2Ruc1Jlc29sdXRpb24gPSBsb2NhbF0gY2FuIGJlICdsb2NhbCcgb3IgJ3JlbW90ZScgLSB3aGVyZSB0aGUgZmluYWxcbiAqIHVybCBzaG91bGQgaGF2ZSBpdHMgRE5TIHJlc29sdmVkLCBsb2NhbGx5IGF0IHRoZSBzdXBlciBwcm94eSwgb3IgcmVtb3RlcyBhdCB0aGUgZXhpdCBub2RlLlxuICogQHByb3BlcnR5IHtCb29sZWFufSBbaHR0cHMgPSBmYWxzZV0gd2hldGhlciB5b3Ugd2FudCB0byB1c2UgYW4gaHR0cHMgcHJveHkgdXJsIG9yIG5vdC5cbiAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gW2NhY2hlU3VwZXJQcm94eSA9IGZhbHNlXSB3aGV0aGVyIG9yIG5vdCB0byBwZXJmb3JtIEROUyBsb29rdXAgb2ZcbiAqIHN1cGVyIHByb3h5IGFuZCBjYWNoZSByZXN1bHQuIEF1dG9tYXRpY2FsbHkgdHVybmVkIG9mZiB3aGVuIGh0dHBzIGlzIHRydWUuXG4gKiBAcHJvcGVydHkge051bWJlcn0gW2NhY2hlVGltZW91dCA9IDYwMDAwXSBmcmVxdWVuY3ksIGluIG1zLCB0aGF0IHlvdSB3YW50IHRvIHJlZnJlc2ggdGhlXG4gKiBjYWNoZSBvZiB0aGUgc3VwZXItcHJveHkgRE5TLCBpZ25vcmVkIGlmIGNhY2hlU3VwZXJQcm94eSBpcyBzZXQgdG8gZmFsc2Ugb3IgaHR0cHMgaXMgc2V0XG4gKiB0byB0cnVlLlxuICovXG5cblxuLyoqXG4gKiBMdW1pbmF0aSEhXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7THVtaW5hdGlDb25maWd9IGNvbmZpZ1xuICpcbiAqXG4gKi9cbmZ1bmN0aW9uIEx1bWluYXRpIChjb25maWcpIHtcbiAgdGhpcy5wb3J0ID0gMjIyMjU7XG4gIHRoaXMuZG5zID0gY29uZmlnLmRuc1Jlc29sdXRpb24gPT0gJ3JlbW90ZScgPyAnZG5zLXJlbW90ZScgOiAnZG5zLWxvY2FsJztcbiAgdGhpcy5wYXNzd29yZCA9IGNvbmZpZy5wYXNzd29yZDtcbiAgdGhpcy5zcENvdW50cnkgPSBjb25maWcuc3VwZXJQcm94eUxvY2F0aW9uIHx8ICdnYic7XG4gIHRoaXMuY291bnRyeSA9IGNvbmZpZy5leGl0TG9jYXRpb24gPyBgLWNvdW50cnktJHtjb25maWcuZXhpdExvY2F0aW9ufWAgOiAnJztcbiAgdGhpcy51c2VyID0gYGx1bS1jdXN0b21lci0ke2NvbmZpZy51c2VybmFtZX0ke3RoaXMuY291bnRyeX0tJHt0aGlzLmRuc31gO1xuICB0aGlzLnMgPSBjb25maWcuaHR0cHMgPyAncycgOiAnJztcbiAgdGhpcy5jYWNoZVN1cGVyUHJveHkgPSB0aGlzLnMgPyBmYWxzZSA6IGNvbmZpZy5jYWNoZVN1cGVyUHJveHk7XG5cbiAgLy8gU2V0IHRoZSBzdXBlciBwcm94eSBob3N0IHRvIHJlZG8gRE5TIGxvb2t1cCBldmVyeSA2MCBzZWNvbmRzLlxuICB2YXIgcmVmcmVzaCA9IGNvbmZpZy5jYWNoZVRpbWVvdXQgfHwgNjAwMDA7XG4gIHRoaXMuaG9zdCA9IF9ob3N0KHJlZnJlc2gsIHRoaXMuY2FjaGVTdXBlclByb3h5LCB0aGlzLnNwQ291bnRyeSk7XG59XG5cbkx1bWluYXRpLnByb3RvdHlwZS5fbWFrZVByb3h5U3RyaW5nID0gZnVuY3Rpb24gKGhvc3QsIGlkKSB7XG4gIHJldHVybiBgaHR0cCR7dGhpcy5zfTovLyR7dGhpcy51c2VyfS1zZXNzaW9uLSR7aWR9OiR7dGhpcy5wYXNzd29yZH1AJHtob3N0fToke3RoaXMucG9ydH1gXG59XG5cbi8qKlxuICogZ2V0UHJveHkgaXMgd2hhdCB5b3UgY2FsbCBldmVyeSB0aW1lIHlvdSBuZWVkIGEgbmV3IGV4aXQgbm9kZS5cbiAqIEBmdW5jdGlvblxuICogQHJldHVybnMge1Byb21pc2V9IFJldHVybnMgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggc3RyaW5nIHRvIHVzZSBhcyBwcm94eSBpbiB5b3VyXG4gKiBuZXQgcmVxdWVzdHMuXG4gKiBOb3RlOiB0aGlzIHByb21pc2Ugd2lsbCBwZXJmb3JtIGEgRE5TIGxvb2t1cCB0aGUgZmlyc3QgdGltZSBpdCBpcyBjYWxsZWQsIGJ1dCBhZnRlclxuICogc2hvdWxkIHJlc29sdmUgaW1tZWRpYXRlbHkuIFRoaXMgaXMgdGhlIGVudGlyZSBzdHJpbmcgdXNlZCBhcyBcImhvc3RcIiB3aGVuXG4gKiBtYWtpbmcgaHR0cCByZXF1ZXN0cyFcbiAqXG4gKiBAZXhhbXBsZVxuXG52YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ3JlcXVlc3QnKTtcbnZhciBMdW1pbmF0aSA9IHJlcXVpcmUoJ2x1bWluYXRpJyk7XG5cbnZhciBsdW1pbmF0aSA9IG5ldyBMdW1pbmF0aSh7XG4gIHVzZXJuYW1lOiAnbXl1c2VybmFtZS16b25lLW15em9uZScsXG4gIHBhc3N3b3JkOiAnbXlwYXNzd29yZCdcbn0pO1xuXG5sdW1pbmF0aS5nZXRQcm94eSgpLnRoZW4ocHJveHkgPT4ge1xuICByZXF1ZXN0KHsgdXJsOiAnaHR0cDovL2Nvb2x1cmwuY29tJywgcHJveHk6IHByb3h5IH0pXG4gICAucGlwZSh0b1doZXJldmVyKVxufSk7XG5cbiAqL1xuTHVtaW5hdGkucHJvdG90eXBlLmdldFByb3h5ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBpZCA9IF9tYWtlU2Vzc2lvbklkKCk7XG4gIHJldHVybiB0aGlzLmhvc3QuZ2V0KGlkKVxuICAgIC50aGVuKGhvc3QgPT4gc2VsZi5fbWFrZVByb3h5U3RyaW5nKGhvc3QsIGlkKSlcbn1cblxuXG5cbi8qKioqKioqKioqKioqKioqKioqIEVYUE9SVFMgKioqKioqKioqKioqKioqKioqKioqKioqKipcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuICBfbWFrZVNlc3Npb25JZDogX21ha2VTZXNzaW9uSWQsXG4gIF9ob3N0OiBfaG9zdCxcbiAgTHVtaW5hdGk6IEx1bWluYXRpXG59XG4iXX0=