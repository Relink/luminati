// spec
var chai = require('chai');
chai.use(require('sinon-chai'));
var Promise = require('bluebird');
var expect = chai.expect;
var sinon = require('sinon');

var luminati = require('./luminati');

describe('luminati', () => {

  describe('makeSessionId', () => {
    it('returns a nice random string every time', () => {
      var one = luminati.makeSessionId();
      var two = luminati.makeSessionId();
      expect(one).not.to.equal(two);
      expect(one.length).to.equal(12);
    })
  })
})
