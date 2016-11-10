/* eslint-env node, mocha*/

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { BasicThrottle } from '../basic';
import Bluebird from 'bluebird';
chai.use(chaiAsPromised);
const expect = chai.expect;

import * as FakeRedis from 'fakeredis';
const RedisGenerator = Bluebird.promisifyAll(FakeRedis);

describe('BasicThrottle', () => {
  it('should back off when pressed', () => {
    const testBasic = new BasicThrottle({
      keyGenerator: (i) => `${i}`,
      max: 3,
      initialWindow: 30,
      redisInstance: RedisGenerator.createClient(),
    });
    return Bluebird.resolve()
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(true))
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(true))
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(true))
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(false))
    .finally(() => testBasic.close());
  });
  it('should close the backoff window', function testTimeout() {
    this.timeout(5000);
    const testBasic = new BasicThrottle({
      keyGenerator: (i) => `${i}`,
      max: 1,
      initialWindow: 2,
      redisInstance: RedisGenerator.createClient(),
    });
    return Bluebird.resolve()
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(true))
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(false))
    .then(() => {
      return new Bluebird((resolve) => {
        setTimeout(() => {
          expect(testBasic.backoff('foo')).to.eventually.equal(true).then(() => resolve());
        }, 2200);
      });
    })
    .finally(() => testBasic.close());
  });
  it('should extend the backoff window', function testTimeoutBackoff() {
    this.timeout(8000);
    const testBasic = new BasicThrottle({
      keyGenerator: (i) => `${i}`,
      max: 1,
      initialWindow: 1,
      extendWindow: 2,
      redisInstance: RedisGenerator.createClient(),
    });
    return Bluebird.resolve()
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(true))
    .then(() => {
      return new Bluebird((resolve) => {
        setTimeout(() => {
          expect(testBasic.backoff('foo')).to.eventually.equal(true).then(() => resolve());
        }, 1200);
      });
    })
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(false))
    .then(() => {
      return new Bluebird((resolve) => {
        setTimeout(() => {
          expect(testBasic.backoff('foo')).to.eventually.equal(false).then(() => resolve());
        }, 1200);
      });
    })
    .finally(() => testBasic.close());
  });

  it('should have a ban window when the backoff is tripped', function testTimeoutBackoff() {
    this.timeout(8000);
    const testBasic = new BasicThrottle({
      keyGenerator: (i) => `${i}`,
      max: 1,
      initialWindow: 1,
      permaBan: 20,
      redisInstance: RedisGenerator.createClient(),
    });
    return Bluebird.resolve()
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(true))
    .then(() => {
      return new Bluebird((resolve) => {
        setTimeout(() => {
          expect(testBasic.backoff('foo')).to.eventually.equal(true).then(() => resolve());
        }, 1200);
      });
    })
    .then(() => expect(testBasic.backoff('foo')).to.eventually.equal(false))
    .then(() => {
      return new Bluebird((resolve) => {
        setTimeout(() => {
          expect(testBasic.backoff('foo')).to.eventually.equal(false).then(() => resolve());
        }, 2200);
      });
    })
    .finally(() => testBasic.close());
  });
});
