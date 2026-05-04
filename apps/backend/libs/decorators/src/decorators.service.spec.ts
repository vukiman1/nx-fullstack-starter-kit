import { Test, TestingModule } from '@nestjs/testing';
import { DecoratorsService } from './decorators.service';

describe('DecoratorsService', () => {
  let service: DecoratorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DecoratorsService],
    }).compile();

    service = module.get<DecoratorsService>(DecoratorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
