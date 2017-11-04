import * as Redis from 'redis';
export interface ThrottleOptions<T> {
    redisInstance?: Redis.RedisClient;
    redis?: Redis.ClientOpts;
    keyGenerator: (T) => string;
    initialWindow: number;
    extendWindow?: number;
    max: number;
    permaBan?: number;
}
export declare class BasicThrottle<T> {
    options: ThrottleOptions<T>;
    redis: Redis.RedisClient;
    keyGenerator: (T) => string;
    incr: any;
    expire: any;
    ttl: any;
    constructor(options: ThrottleOptions<T>);
    backoff(arg: T): Promise<boolean>;
    close(): void;
}
