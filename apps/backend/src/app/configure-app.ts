import { ClassSerializerInterceptor, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import configuration from '@org/backend-config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createAppLogger } from './app.logger';
import { useSwagger } from './app.swagger';

export const GLOBAL_PREFIX = 'api';

const HEALTH_ROUTES = [
  { path: 'health/liveness', method: RequestMethod.GET },
  { path: 'health/readiness', method: RequestMethod.GET },
];

export function configureApp(app: NestExpressApplication): void {
  app.useLogger(createAppLogger());
  const { app: appConfig, cors } = configuration();
  const isProduction = appConfig.nodeEnv === 'production';

  app.set('trust proxy', appConfig.trustProxy);
  app.use(helmet(isProduction ? undefined : { contentSecurityPolicy: false }));
  app.setGlobalPrefix(GLOBAL_PREFIX, { exclude: HEALTH_ROUTES });
  app.use(cookieParser());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors({
    origin: cors.origins,
    credentials: true,
  });

  if (!isProduction) {
    useSwagger(app);
  }
}
