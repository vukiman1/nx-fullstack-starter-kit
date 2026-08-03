import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const PING_TIMEOUT_MS = 300;

/**
 * Replaces TypeOrmHealthIndicator, which resolves the typeorm package through a runtime require
 * from inside @nestjs/terminus. That lookup fails wherever the dependency tree is not hoisted —
 * pnpm's layout copied into a serverless bundle, for one — and takes the whole app down on boot.
 */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database health check timed out')), PING_TIMEOUT_MS);
        }),
      ]);
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : 'Database ping failed',
      });
    }
  }
}
