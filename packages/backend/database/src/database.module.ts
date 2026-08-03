import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as pg from 'pg';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        // Handing the driver over explicitly: TypeORM otherwise requires 'pg' by name from its own
        // location, which breaks anywhere the dependency tree is not hoisted — a bundled
        // serverless function, for one.
        driver: pg,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        autoLoadEntities: true,
        migrationsTableName: 'migrations',
        synchronize: false,
        // managed Postgres (Neon, Supabase, RDS) refuses plaintext connections
        ssl: configService.get<boolean>('database.tls') ? { rejectUnauthorized: false } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
