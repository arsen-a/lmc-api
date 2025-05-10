import { Test, TestingModule } from '@nestjs/testing';
import { ContentChunksService } from './content-chunks.service';

describe('ContentChunksService', () => {
  let service: ContentChunksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentChunksService],
    }).compile();

    service = module.get<ContentChunksService>(ContentChunksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
