# Venkman
A simple, redis-based throttle-backoff system.

> Back off man, I'm a Scientist.
> 
> -Peter Venkman, Ghostbusters

Usage:

```
import { BasicThrottle } from 'venkman';
const testThrottle = new BasicThrottle({
  initialWindow: 20,
  keyGenerator: ({ userId, messageId }) => `example:${userId}:{messageId}`,
  max: 3,
})

testThrottle.backoff('test').then((v) => v === true);
testThrottle.backoff('test').then((v) => v === true);
testThrottle.backoff('test').then((v) => v === true);
testThrottle.backoff('test').then((v) => v === false);
```

## BasicThrottle constructor options:

*initialWindow* (required): time in seconds from the first request that the throttle counts until expiring. Value is in seconds (not milliseconds) due to redis's ttl granularity.

*max* (required): the number of requests allowed before rejecting future requests.

*keyGenerator* (required): should return a string when called with the backoff argument, used to determine which throttle the BasicThrottle is using.

*extendWindow*: if present, the ttl on the throttle is extended by this value in seconds for every request after the first.

*permaBan*: if present, this value is set as the ttl on the throttle whenever a request over max is made (so, after you've gone over the limit, you're cut off for 30 minutes)

*redis*: options passed to the redis client.

*redisInstance*: if you have created a redis client outside the Throttle and want to use that instead.

## BasicThrottle methods:

backoff<T>(arg: T): check to see if the throttle named by the keyGenerator callback is over max. Returns a promise that resolves to either true (at or under max) or false (over max).

close(): cleans up the redis instance. Call this if you didn't pass your own redis instance in and don't want to leak resources.

## Important Collision Issue

BasicThrottle uses redis, which is globally-accessible. If you use the same keyGenerator and connect to the same redis db in two throttles, you'll be accessing the same state. This is good if you need global throttles (if you have many instances of an applications server), and bad if you didn't intend that.

Use the options.redis.db value to select the redis db you want to use (and increment it with different BasicThrottle instances if you want no chance of collisions), and / or make sure that your keyGenerator function is a one-to-one mapping rather than many-to-one, or else you'll get throttle collisions.
