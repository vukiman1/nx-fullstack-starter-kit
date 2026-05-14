import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@org/backend-database';
import { CryptoModule } from '@org/backend-crypto';
import { JwtModule } from '@org/backend-jwt';
import configuration from '@org/backend-config';
import { RedisModule } from '@org/backend-redis';
import { join } from 'path';
import { AuthModule } from '../api/auth/auth.module';
import { UserModule } from '../api/user/user.module';
import { HealthModule } from '../health/health.module';
import { AppController } from './app.controller';
import { providers } from './app.provider';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [configuration],
      expandVariables: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'client'),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    DatabaseModule,
    JwtModule,
    CryptoModule,
    AuthModule,
    UserModule,
    RedisModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, ...providers],
})
export class AppModule {}
