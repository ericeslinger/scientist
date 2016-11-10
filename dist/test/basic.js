'use strict';

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

var _basic = require('../basic');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fakeredis = require('fakeredis');

var FakeRedis = _interopRequireWildcard(_fakeredis);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-env node, mocha*/

_chai2.default.use(_chaiAsPromised2.default);
var expect = _chai2.default.expect;

var RedisGenerator = _bluebird2.default.promisifyAll(FakeRedis);

describe('BasicThrottle', function () {
  it('should back off when pressed', function () {
    var testBasic = new _basic.BasicThrottle({
      keyGenerator: function keyGenerator(i) {
        return '' + i;
      },
      max: 3,
      initialWindow: 30,
      redisInstance: RedisGenerator.createClient()
    });
    return _bluebird2.default.resolve().then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(true);
    }).then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(true);
    }).then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(true);
    }).then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(false);
    }).finally(function () {
      return testBasic.close();
    });
  });
  it('should close the backoff window', function testTimeout() {
    this.timeout(5000);
    var testBasic = new _basic.BasicThrottle({
      keyGenerator: function keyGenerator(i) {
        return '' + i;
      },
      max: 1,
      initialWindow: 2,
      redisInstance: RedisGenerator.createClient()
    });
    return _bluebird2.default.resolve().then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(true);
    }).then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(false);
    }).then(function () {
      return new _bluebird2.default(function (resolve) {
        setTimeout(function () {
          expect(testBasic.backoff('foo')).to.eventually.equal(true).then(function () {
            return resolve();
          });
        }, 2200);
      });
    }).finally(function () {
      return testBasic.close();
    });
  });
  it('should extend the backoff window', function testTimeoutBackoff() {
    this.timeout(8000);
    var testBasic = new _basic.BasicThrottle({
      keyGenerator: function keyGenerator(i) {
        return '' + i;
      },
      max: 1,
      initialWindow: 1,
      extendWindow: 2,
      redisInstance: RedisGenerator.createClient()
    });
    return _bluebird2.default.resolve().then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(true);
    }).then(function () {
      return new _bluebird2.default(function (resolve) {
        setTimeout(function () {
          expect(testBasic.backoff('foo')).to.eventually.equal(true).then(function () {
            return resolve();
          });
        }, 1200);
      });
    }).then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(false);
    }).then(function () {
      return new _bluebird2.default(function (resolve) {
        setTimeout(function () {
          expect(testBasic.backoff('foo')).to.eventually.equal(false).then(function () {
            return resolve();
          });
        }, 1200);
      });
    }).finally(function () {
      return testBasic.close();
    });
  });

  it('should have a ban window when the backoff is tripped', function testTimeoutBackoff() {
    this.timeout(8000);
    var testBasic = new _basic.BasicThrottle({
      keyGenerator: function keyGenerator(i) {
        return '' + i;
      },
      max: 1,
      initialWindow: 1,
      permaBan: 20,
      redisInstance: RedisGenerator.createClient()
    });
    return _bluebird2.default.resolve().then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(true);
    }).then(function () {
      return new _bluebird2.default(function (resolve) {
        setTimeout(function () {
          expect(testBasic.backoff('foo')).to.eventually.equal(true).then(function () {
            return resolve();
          });
        }, 1200);
      });
    }).then(function () {
      return expect(testBasic.backoff('foo')).to.eventually.equal(false);
    }).then(function () {
      return new _bluebird2.default(function (resolve) {
        setTimeout(function () {
          expect(testBasic.backoff('foo')).to.eventually.equal(false).then(function () {
            return resolve();
          });
        }, 2200);
      });
    }).finally(function () {
      return testBasic.close();
    });
  });
});