import './config-bootstrap';
import './instrument';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { AppModule } from './app/app.module';
import { configureApp } from './app/configure-app';

const server: Express = express();

// A warm invocation reuses the container, so the Nest app is built once and the promise is cached;
// concurrent cold requests must await the same bootstrap instead of each starting their own.
let bootstrapped: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    { bufferLogs: true },
  );
  configureApp(app);
  await app.init();
}

export default async function handler(request: Request, response: Response): Promise<void> {
  bootstrapped ??= bootstrap();
  await bootstrapped;
  server(request, response);
}
