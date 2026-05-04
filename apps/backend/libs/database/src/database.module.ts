import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { options } from 'ormconfigs';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...options,
      autoLoadEntities: true,
    }),
  ],
})
export class DatabaseModule {}
