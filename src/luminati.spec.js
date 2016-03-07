// spec
var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var sinon = require('sinon');
var nock = require('nock');
var proxyquire = require('proxyquire');

var lookupMock = sinon.stub();

var luminati = proxyquire('./luminati', {
  dns: {
    lookup: lookupMock
  }
});

describe('luminati', () => {

  beforeEach(() => {
    lookupMock.reset();
  })

  describe('_makeSessionId', () => {
    it('returns a nice random string every time', () => {
      var one = luminati._makeSessionId();
      var two = luminati._makeSessionId();
      expect(one).not.to.equal(two);
      expect(one.length > 16);
    });
  });

  describe('_host', () => {
    it('calls lookup on the dns when called before its interval ' +
       'gives it a chance to call itslef', done => {

         var time = 10000;
         var start = Date.now();
         var host = luminati._host(time);

         lookupMock.callsArgWith(1, null, Promise.resolve('foo'));

         host
           .get(1)
           .then(ip => {
             var elapsed = Date.now() - start;
             expect(elapsed > time);
             expect(ip).to.equal('foo');
             expect(lookupMock).to.have.been.calledOnce;
             host.cleanup()
             done();
           });
       });

    it('it will resolve immediately if called after first interval', done => {
      var time = 20;
      var host = luminati._host(time);

      var responses = ['foo', 'bar', 'baz'];

      lookupMock.onCall(0).callsArgWith(1, null, Promise.resolve(responses[0]));
      lookupMock.onCall(1).callsArgWith(1, null, Promise.resolve(responses[1]));
      lookupMock.onCall(2).callsArgWith(1, null, Promise.resolve(responses[2]));

      setTimeout(() => {
        var count = lookupMock.callCount;
        host
          .get(1)
          .then(ip => {
            expect(lookupMock.callCount).to.equal(count);
            expect(ip).to.equal(responses[count - 1]);
            host.cleanup();
            done();
          });
      }, time*3);
    });

    it('calls lookup with a string that takes into account country and id', () => {

      // NOTE: this is implicitly testing _getDomain
      var host = luminati._host(10000, 'gb');
      host.get(1)
      expect(lookupMock.firstCall.args[0])
        .to.equal('servercountry-gb-session-1.zproxy.luminati.io');
      host.cleanup();
    });
  });

  describe('getProxy', () => {
    it('returns a string with the user and password from config', done => {
      var config = {
        username: 'user',
        password: 'secret'
      }

      lookupMock.onCall(0).callsArgWith(1, null, Promise.resolve('qux'));
      var lum = new luminati.Luminati(config);

      lum.getProxy()
        .then(proxy => {
          expect(proxy).to.match(/customer\-user\-dns/);
          expect(proxy).to.match(/\:secret\@qux/);
          expect(lookupMock.firstCall.args[0]).to.match(/servercountry-gb/)
          lum.host.cleanup();
          done();
        });
    });

    it('reflects https, country, and dnsResolution options in final string', done => {
      var config = {
        username: 'user',
        password: 'secret',
        dnsResolution: 'remote',
        exitLocation: 'nl',
        https: true
      };

      lookupMock.onCall(0).callsArgWith(1, null, Promise.resolve('qux'));
      var lum = new luminati.Luminati(config);

      lum.getProxy()
        .then(proxy => {
          expect(proxy).to.match(/dns\-remote/);
          expect(proxy).to.match(/country\-nl/)
          lum.host.cleanup();
          done();
        });
    });

    it('reflects superProxyLocation in its call to lookup location', () => {
      var config = {
        username: 'user',
        password: 'secret',
        superProxyLocation: 'nl'
      };

      var lum = new luminati.Luminati(config);

      lum.getProxy();
      expect(lookupMock.firstCall.args[0]).to.match(/servercountry-nl/)
      lum.host.cleanup();
    });
  });
})
