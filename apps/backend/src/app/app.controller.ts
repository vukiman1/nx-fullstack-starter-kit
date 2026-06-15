import { Controller, Get, NotFoundException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import configuration from '@org/backend-config';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('debug-sentry')
  triggerTestError(): never {
    if (configuration().app.nodeEnv === 'production') {
      throw new NotFoundException();
    }

    Sentry.logger.info('Test error triggered from /api/debug-sentry');
    throw new Error('Sentry test error from /api/debug-sentry');
  }
}
