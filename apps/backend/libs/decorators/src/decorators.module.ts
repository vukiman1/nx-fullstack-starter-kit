import { Module } from '@nestjs/common';
import { DecoratorsService } from './decorators.service';

@Module({
  providers: [DecoratorsService],
  exports: [DecoratorsService],
})
export class DecoratorsModule {}
