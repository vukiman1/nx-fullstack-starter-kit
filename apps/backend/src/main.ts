/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import './instrument';
import { ClassSerializerInterceptor, Logger, RequestMethod } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import configuration from '@org/backend-config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { createAppLogger } from './app/app.logger';
import { useSwagger } from './app/app.swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(createAppLogger());
  const { app: appConfig, cors } = configuration();
  const isProduction = appConfig.nodeEnv === 'production';

  app.use(helmet(isProduction ? undefined : { contentSecurityPolicy: false }));
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: [
      { path: 'health/liveness', method: RequestMethod.GET },
      { path: 'health/readiness', method: RequestMethod.GET },
    ],
  });
  app.use(cookieParser());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors({
    origin: cors.origins,
    credentials: true,
  });
  if (!isProduction) {
    useSwagger(app);
  }
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
