import { expect } from 'chai';
import { BasicThrottle } from '../src/index';

import * as FakeRedis from 'fakeredis';

describe('BasicThrottle', () => {
  it('should back off when pressed', () => {
    const testBasic = new BasicThrottle<string>({
      keyGenerator: i => `${i}`,
      max: 3,
      initialWindow: 30,
      redisInstance: FakeRedis.createClient(),
    });
    return Promise.resolve()
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(true)))
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(true)))
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(true)))
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(false)))
      .then(() => testBasic.close());
  });
  it('should close the backoff window', function testTimeout() {
    this.timeout(5000);
    const testBasic = new BasicThrottle({
      keyGenerator: i => `${i}`,
      max: 1,
      initialWindow: 2,
      redisInstance: FakeRedis.createClient(),
    });
    return Promise.resolve()
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(true)))
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(false)))
      .then(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            testBasic
              .backoff('foo')
              .then(v => expect(v).to.equal(true))
              .then(() => resolve());
          }, 2200);
        });
      })
      .then(() => testBasic.close());
  });
  it('should extend the backoff window', function testTimeoutBackoff() {
    this.timeout(8000);
    const testBasic = new BasicThrottle({
      keyGenerator: i => `${i}`,
      max: 1,
      initialWindow: 1,
      extendWindow: 2,
      redisInstance: FakeRedis.createClient(),
    });
    return Promise.resolve()
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(true)))
      .then(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            testBasic
              .backoff('foo')
              .then(v => expect(v).to.equal(true))
              .then(() => resolve());
          }, 1200);
        });
      })
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(false)))
      .then(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            testBasic
              .backoff('foo')
              .then(v => expect(v).to.equal(false))
              .then(() => resolve());
          }, 1200);
        });
      })
      .then(() => testBasic.close());
  });

  it('should have a ban window when the backoff is tripped', function testTimeoutBackoff() {
    this.timeout(8000);
    const testBasic = new BasicThrottle({
      keyGenerator: i => `${i}`,
      max: 1,
      initialWindow: 1,
      permaBan: 20,
      redisInstance: FakeRedis.createClient(),
    });
    return Promise.resolve()
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(true)))
      .then(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            testBasic
              .backoff('foo')
              .then(v => expect(v).to.equal(true))
              .then(() => resolve());
          }, 1200);
        });
      })
      .then(() => testBasic.backoff('foo').then(v => expect(v).to.equal(false)))
      .then(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            testBasic
              .backoff('foo')
              .then(v => expect(v).to.equal(false))
              .then(() => resolve());
          }, 2200);
        });
      })
      .then(() => testBasic.close());
  });
});
