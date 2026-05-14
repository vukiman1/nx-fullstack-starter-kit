import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { RedisService } from '@org/backend-redis';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redisService: RedisService,
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const response = await Promise.race([
        this.redisService.ping(),
        new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('Redis health check timed out')), 300);
        }),
      ]);

      return response === 'PONG'
        ? indicator.up()
        : indicator.down({ message: `Unexpected Redis response: ${response}` });
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'Redis ping failed',
      });
    }
  }
}
