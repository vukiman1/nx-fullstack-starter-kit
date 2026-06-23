import { MetadataKey } from '@org/backend-constants';
import { RedisType } from '@org/backend-interfaces';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject(MetadataKey.REDIS) private redis: Redis) {}

  set(redisData: RedisType): Promise<'OK'> {
    const { key, value, expired } = redisData;
    return this.redis.set(key, value, 'EX', expired);
  }

  setNx(redisData: RedisType): Promise<number> {
    return this.redis.setnx(redisData.key, redisData.value);
  }

  get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  ping(): Promise<string> {
    return this.redis.ping();
  }

  zRem(key: string, ...members: string[]): Promise<number> {
    return this.redis.zrem(key, ...members);
  }

  zRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redis.zrange(key, start, stop);
  }

  eval<T = unknown>(script: string, numKeys: number, ...args: Array<string | number>): Promise<T> {
    return this.redis.eval(script, numKeys, ...args) as Promise<T>;
  }
}
