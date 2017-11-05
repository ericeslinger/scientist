import * as Redis from 'redis';
import { promisify } from 'util';

const $redis = Symbol('$redis');

export interface ThrottleOptions<T> {
  redisInstance?: Redis.RedisClient;
  redis?: Redis.ClientOpts;
  keyGenerator: (T) => string;
  initialWindow: number;
  extendWindow?: number;
  max: number;
  permaBan?: number;
}

export class BasicThrottle<T> {
  redis: Redis.RedisClient;
  keyGenerator: (T) => string;
  incr: any;
  expire: any;
  ttl: any;
  constructor(public options: ThrottleOptions<T>) {
    if (options.redisInstance === undefined) {
      const redisOptions = Object.assign(
        {},
        {
          port: 6379,
          host: 'localhost',
          db: 0,
          retry_strategy: o => {
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
        options.redis,
      );
      this.redis = Redis.createClient(redisOptions);
    } else {
      this.redis = options.redisInstance;
    }
    this.keyGenerator = options.keyGenerator;
    this.incr = promisify(this.redis.incr.bind(this.redis));
    this.expire = promisify(this.redis.expire.bind(this.redis));
    this.ttl = promisify(this.redis.ttl.bind(this.redis));
  }

  // on initial set, expire after initialWindow seconds.
  // if extendWindow, extend the expiry that many seconds per access

  async backoff(arg: T) {
    const total = await this.incr(this.keyGenerator(arg));
    if (total === 1) {
      await this.expire(this.keyGenerator(arg), this.options.initialWindow);
    } else if (this.options.extendWindow) {
      const ttl = await this.ttl(this.keyGenerator(arg));
      await this.expire(
        this.keyGenerator(arg),
        ttl + this.options.extendWindow,
      );
    }
    if (total > this.options.max) {
      if (this.options.permaBan) {
        await this.expire(this.keyGenerator(arg), this.options.permaBan);
      }
      return false;
    } else {
      return true;
    }
  }

  close() {
    this.backoff = () => {
      throw new Error('Cannot access closed throttle');
    };
    this.redis.quit();
  }
}
