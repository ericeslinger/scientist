import * as Redis from 'redis';
import * as Bluebird from 'bluebird';
const RedisService = Bluebird.promisifyAll(Redis);

const $redis = Symbol('$redis');


export class BasicThrottle {
  constructor(options = {}) {
    if (options.redisInstance === undefined) {
      const redisOptions = Object.assign(
        {},
        {
          port: 6379,
          host: 'localhost',
          db: 0,
          retry_strategy: (o) => {
            if (o.error.code === 'ECONNREFUSED') {
              // End reconnecting on a specific error and flush all commands with a individual error
              return new Error('The server refused the connection');
            }
            if (o.total_retry_time > 1000 * 60 * 60) {
              // End reconnecting after a specific timeout and flush all commands with a individual error
              return new Error('Retry time exhausted');
            }
            if (o.times_connected > 10) {
              // End reconnecting with built in error
              return undefined;
            }
            // reconnect after
            return Math.max(o.attempt * 100, 3000);
          },
        },
        options.redis
      );
      this[$redis] = RedisService.createClient(redisOptions);
    } else {
      this[$redis] = options.redisInstance;
    }
    this.keyGenerator = options.keyGenerator;
    this.options = Object.assign({}, options);
    delete this.options.redis;
    delete this.options.keyGenerator;
  }

  // on initial set, expire after initialWindow seconds.
  // if extendWindow, extend the expiry that many seconds per access

  backoff(...args) {
    return this[$redis].incrAsync(this.keyGenerator(...args))
    .then((val) => {
      if (val === 1) {
        return this[$redis].expireAsync(this.keyGenerator(...args), this.options.initialWindow)
        .then(() => val);
      } else if (this.options.extendWindow) {
        return this[$redis].ttlAsync(this.keyGenerator(...args))
        .then((ttl) => {
          return this[$redis].expireAsync(this.keyGenerator(...args), ttl + this.options.extendWindow);
        }).then(() => val);
      } else {
        return val;
      }
    }).then((val) => {
      if (val > this.options.max) {
        if (this.options.permaBan) {
          return this[$redis].expireAsync(this.keyGenerator(...args), this.options.permaBan)
          .then(() => false);
        }
        return false;
      } else {
        return true;
      }
    });
  }

  close() {
    this.backoff = () => {
      throw new Error('Cannot access closed throttle');
    };
    return this[$redis].quitAsync()
    .then(() => {
      delete this[$redis];
    });
  }

}
