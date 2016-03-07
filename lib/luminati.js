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
function _host(interval, country) {
  var host = false;

  // periodically resolve DNS fom zproxy, which will
  // give their currently fastest super proxies.
  // This also means we don't perform this DNS resolution
  // at call time.
  var stopInterval = setInterval(function () {
    var id = _makeSessionId();
    lookup(_getDomain(id, country)).then(function (_host) {
      host = _host;
    });
  }, interval);

  return {

    // get takes the current session id and returns either the
    // current host, if we hav already resolved one, or resolves
    // one asynchronously if we don't yet have one.
    get: function get(id) {
      if (host) {
        return Promise.resolve(host);
      };
      // if we don't have a host, resolve one, and cache it!
      return lookup(_getDomain(id, country)).then(function (_host) {
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
 * @property {Number} [frequency = 60000] frequency, in ms, that you want to refresh the DNS
 * of the super-proxy you are using.
 * @property {String} [superProxyLocation = gb] country code to use for super proxy location.
 * @property {String} [exitLocation = false] country code if you want exit node to be in a specific
 * country. If not provided, will provide exit nodes in random countries.
 * @property {String} [dnsResolution = local] can be 'local' or 'remote' - where the final
 * url should have its DNS resolved, locally at the super proxy, or remotes at the exit node.
 * @property {Boolean} [https = false] whether you want to use an https proxy url or not.
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

  // Set the super proxy host to redo DNS lookup every 60 seconds.
  var refresh = config.refresh || 60000;
  this.host = _host(refresh, this.spCountry);
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
//# sourceMappingURL=data:application/json;base64,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RUFBZCxFQUNKLElBREksQ0FDQztXQUFRLEtBQUssZ0JBQUwsQ0FBc0IsSUFBdEIsRUFBNEIsRUFBNUI7R0FBUixDQURSLENBSHdDO0NBQVo7Ozs7QUFXOUIsT0FBTyxPQUFQLEdBQWlCO0FBQ2Ysa0JBQWdCLGNBQWhCO0FBQ0EsU0FBTyxLQUFQO0FBQ0EsWUFBVSxRQUFWO0NBSEYiLCJmaWxlIjoibHVtaW5hdGkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBsdW1pbmF0aS5qc1xudmFyIFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpO1xudmFyIGxvb2t1cCA9IFByb21pc2UucHJvbWlzaWZ5KHJlcXVpcmUoJ2RucycpLmxvb2t1cCk7XG5cbi8vIFRoaXMganVzdCBjcmVhdGVzIGEgcmFuZG9tIG51bWJlci5cbmZ1bmN0aW9uIF9tYWtlU2Vzc2lvbklkKCkge1xuICB2YXIgZGF0ZSA9ICcnICsgRGF0ZS5ub3coKTtcbiAgcmV0dXJuIGRhdGUgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMClcbn1cblxuXG4vLyBDcmVhdGVzIHRoZSBzdHJpbmcgZm9yIHRoZSBzdXBlci1wcm94eSBkb21haW4gdG8gYmUgbG9va2VkIHVwLlxuLy8gV2Ugc2VuZCBhIG5ldyBzZXNzaW9uIGlkIGluIG9yZGVyIHRvIGdldCBhIG5ldyBzdXBlciBwcm94eS5cbmZ1bmN0aW9uIF9nZXREb21haW4gKHNlc3Npb25faWQsIGNvdW50cnkpIHtcbiAgcmV0dXJuIGBzZXJ2ZXJjb3VudHJ5LSR7Y291bnRyeX0tc2Vzc2lvbi0ke3Nlc3Npb25faWR9Lnpwcm94eS5sdW1pbmF0aS5pb2Bcbn1cblxuLy8gS2VlcHMgdHJhY2sgb2YgbGF0ZXN0IElQIGZvciBzdXBlciBwcm94eSB0byB1c2UuXG5mdW5jdGlvbiBfaG9zdCAoaW50ZXJ2YWwsIGNvdW50cnkpIHtcbiAgdmFyIGhvc3QgPSBmYWxzZTtcblxuICAvLyBwZXJpb2RpY2FsbHkgcmVzb2x2ZSBETlMgZm9tIHpwcm94eSwgd2hpY2ggd2lsbFxuICAvLyBnaXZlIHRoZWlyIGN1cnJlbnRseSBmYXN0ZXN0IHN1cGVyIHByb3hpZXMuXG4gIC8vIFRoaXMgYWxzbyBtZWFucyB3ZSBkb24ndCBwZXJmb3JtIHRoaXMgRE5TIHJlc29sdXRpb25cbiAgLy8gYXQgY2FsbCB0aW1lLlxuICB2YXIgc3RvcEludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgIHZhciBpZCA9IF9tYWtlU2Vzc2lvbklkKCk7XG4gICAgbG9va3VwKF9nZXREb21haW4oaWQsIGNvdW50cnkpKVxuICAgICAgLnRoZW4oX2hvc3QgPT4ge1xuICAgICAgICBob3N0ID0gX2hvc3Q7XG4gICAgICB9KVxuICB9LCBpbnRlcnZhbClcblxuICByZXR1cm4ge1xuXG4gICAgLy8gZ2V0IHRha2VzIHRoZSBjdXJyZW50IHNlc3Npb24gaWQgYW5kIHJldHVybnMgZWl0aGVyIHRoZVxuICAgIC8vIGN1cnJlbnQgaG9zdCwgaWYgd2UgaGF2IGFscmVhZHkgcmVzb2x2ZWQgb25lLCBvciByZXNvbHZlc1xuICAgIC8vIG9uZSBhc3luY2hyb25vdXNseSBpZiB3ZSBkb24ndCB5ZXQgaGF2ZSBvbmUuXG4gICAgZ2V0OiBmdW5jdGlvbiBnZXQgKGlkKSB7XG4gICAgICBpZiAoaG9zdCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGhvc3QpO1xuICAgICAgfTtcbiAgICAgIC8vIGlmIHdlIGRvbid0IGhhdmUgYSBob3N0LCByZXNvbHZlIG9uZSwgYW5kIGNhY2hlIGl0IVxuICAgICAgcmV0dXJuIGxvb2t1cChfZ2V0RG9tYWluKGlkLCBjb3VudHJ5KSlcbiAgICAgICAgLnRoZW4oX2hvc3QgPT4ge1xuICAgICAgICAgIGhvc3QgPSBfaG9zdDtcbiAgICAgICAgICByZXR1cm4gX2hvc3Q7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgY2xlYW51cDogY2xlYXJJbnRlcnZhbC5iaW5kKG51bGwsIHN0b3BJbnRlcnZhbClcbiAgfTtcbn07XG5cbi8qKlxuICogQHR5cGVkZWYge09iamVjdH0gTHVtaW5hdGlDb25maWdcbiAqIEBwcm9wZXJ0eSB7U3RyaW5nfSB1c2VybmFtZSBsdW1pbmF0aSB1c2VybmFtZSBpbiB0aGUgZm9ybSBVU0VSLXpvbmUtWk9ORVxuICogQHByb3BlcnR5IHtTdHJpbmd9IHBhc3N3b3JkIGx1bWluYXRpIHBhc3N3b3JkXG4gKiBAcHJvcGVydHkge051bWJlcn0gW2ZyZXF1ZW5jeSA9IDYwMDAwXSBmcmVxdWVuY3ksIGluIG1zLCB0aGF0IHlvdSB3YW50IHRvIHJlZnJlc2ggdGhlIEROU1xuICogb2YgdGhlIHN1cGVyLXByb3h5IHlvdSBhcmUgdXNpbmcuXG4gKiBAcHJvcGVydHkge1N0cmluZ30gW3N1cGVyUHJveHlMb2NhdGlvbiA9IGdiXSBjb3VudHJ5IGNvZGUgdG8gdXNlIGZvciBzdXBlciBwcm94eSBsb2NhdGlvbi5cbiAqIEBwcm9wZXJ0eSB7U3RyaW5nfSBbZXhpdExvY2F0aW9uID0gZmFsc2VdIGNvdW50cnkgY29kZSBpZiB5b3Ugd2FudCBleGl0IG5vZGUgdG8gYmUgaW4gYSBzcGVjaWZpY1xuICogY291bnRyeS4gSWYgbm90IHByb3ZpZGVkLCB3aWxsIHByb3ZpZGUgZXhpdCBub2RlcyBpbiByYW5kb20gY291bnRyaWVzLlxuICogQHByb3BlcnR5IHtTdHJpbmd9IFtkbnNSZXNvbHV0aW9uID0gbG9jYWxdIGNhbiBiZSAnbG9jYWwnIG9yICdyZW1vdGUnIC0gd2hlcmUgdGhlIGZpbmFsXG4gKiB1cmwgc2hvdWxkIGhhdmUgaXRzIEROUyByZXNvbHZlZCwgbG9jYWxseSBhdCB0aGUgc3VwZXIgcHJveHksIG9yIHJlbW90ZXMgYXQgdGhlIGV4aXQgbm9kZS5cbiAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gW2h0dHBzID0gZmFsc2VdIHdoZXRoZXIgeW91IHdhbnQgdG8gdXNlIGFuIGh0dHBzIHByb3h5IHVybCBvciBub3QuXG4gKi9cblxuXG4vKipcbiAqIEx1bWluYXRpISFcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtMdW1pbmF0aUNvbmZpZ30gY29uZmlnXG4gKlxuICpcbiAqL1xuZnVuY3Rpb24gTHVtaW5hdGkgKGNvbmZpZykge1xuICB0aGlzLnBvcnQgPSAyMjIyNTtcbiAgdGhpcy5kbnMgPSBjb25maWcuZG5zUmVzb2x1dGlvbiA9PSAncmVtb3RlJyA/ICdkbnMtcmVtb3RlJyA6ICdkbnMtbG9jYWwnO1xuICB0aGlzLnBhc3N3b3JkID0gY29uZmlnLnBhc3N3b3JkO1xuICB0aGlzLnNwQ291bnRyeSA9IGNvbmZpZy5zdXBlclByb3h5TG9jYXRpb24gfHwgJ2diJztcbiAgdGhpcy5jb3VudHJ5ID0gY29uZmlnLmV4aXRMb2NhdGlvbiA/IGAtY291bnRyeS0ke2NvbmZpZy5leGl0TG9jYXRpb259YCA6ICcnO1xuICB0aGlzLnVzZXIgPSBgbHVtLWN1c3RvbWVyLSR7Y29uZmlnLnVzZXJuYW1lfSR7dGhpcy5jb3VudHJ5fS0ke3RoaXMuZG5zfWA7XG4gIHRoaXMucyA9IGNvbmZpZy5odHRwcyA/ICdzJyA6ICcnO1xuXG4gIC8vIFNldCB0aGUgc3VwZXIgcHJveHkgaG9zdCB0byByZWRvIEROUyBsb29rdXAgZXZlcnkgNjAgc2Vjb25kcy5cbiAgdmFyIHJlZnJlc2ggPSBjb25maWcucmVmcmVzaCB8fCA2MDAwMDtcbiAgdGhpcy5ob3N0ID0gX2hvc3QocmVmcmVzaCwgdGhpcy5zcENvdW50cnkpO1xufVxuXG5MdW1pbmF0aS5wcm90b3R5cGUuX21ha2VQcm94eVN0cmluZyA9IGZ1bmN0aW9uIChob3N0LCBpZCkge1xuICByZXR1cm4gYGh0dHAke3RoaXMuc306Ly8ke3RoaXMudXNlcn0tc2Vzc2lvbi0ke2lkfToke3RoaXMucGFzc3dvcmR9QCR7aG9zdH06JHt0aGlzLnBvcnR9YFxufVxuXG4vKipcbiAqIGdldFByb3h5IGlzIHdoYXQgeW91IGNhbGwgZXZlcnkgdGltZSB5b3UgbmVlZCBhIG5ldyBleGl0IG5vZGUuXG4gKiBAZnVuY3Rpb25cbiAqIEByZXR1cm5zIHtQcm9taXNlfSBSZXR1cm5zIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aXRoIHN0cmluZyB0byB1c2UgYXMgcHJveHkgaW4geW91clxuICogbmV0IHJlcXVlc3RzLlxuICogTm90ZTogdGhpcyBwcm9taXNlIHdpbGwgcGVyZm9ybSBhIEROUyBsb29rdXAgdGhlIGZpcnN0IHRpbWUgaXQgaXMgY2FsbGVkLCBidXQgYWZ0ZXJcbiAqIHNob3VsZCByZXNvbHZlIGltbWVkaWF0ZWx5LiBUaGlzIGlzIHRoZSBlbnRpcmUgc3RyaW5nIHVzZWQgYXMgXCJob3N0XCIgd2hlblxuICogbWFraW5nIGh0dHAgcmVxdWVzdHMhXG4gKlxuICogQGV4YW1wbGVcblxudmFyIHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XG52YXIgTHVtaW5hdGkgPSByZXF1aXJlKCdsdW1pbmF0aScpO1xuXG52YXIgbHVtaW5hdGkgPSBuZXcgTHVtaW5hdGkoe1xuICB1c2VybmFtZTogJ215dXNlcm5hbWUtem9uZS1teXpvbmUnLFxuICBwYXNzd29yZDogJ215cGFzc3dvcmQnXG59KTtcblxubHVtaW5hdGkuZ2V0UHJveHkoKS50aGVuKHByb3h5ID0+IHtcbiAgcmVxdWVzdCh7IHVybDogJ2h0dHA6Ly9jb29sdXJsLmNvbScsIHByb3h5OiBwcm94eSB9KVxuICAgLnBpcGUodG9XaGVyZXZlcilcbn0pO1xuXG4gKi9cbkx1bWluYXRpLnByb3RvdHlwZS5nZXRQcm94eSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgaWQgPSBfbWFrZVNlc3Npb25JZCgpO1xuICByZXR1cm4gdGhpcy5ob3N0LmdldChpZClcbiAgICAudGhlbihob3N0ID0+IHNlbGYuX21ha2VQcm94eVN0cmluZyhob3N0LCBpZCkpXG59XG5cblxuXG4vKioqKioqKioqKioqKioqKioqKiBFWFBPUlRTICoqKioqKioqKioqKioqKioqKioqKioqKioqXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgX21ha2VTZXNzaW9uSWQ6IF9tYWtlU2Vzc2lvbklkLFxuICBfaG9zdDogX2hvc3QsXG4gIEx1bWluYXRpOiBMdW1pbmF0aVxufVxuIl19