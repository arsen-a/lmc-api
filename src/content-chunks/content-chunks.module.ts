import { Module } from '@nestjs/common';
import { ContentChunksService } from './content-chunks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentChunk } from './content-chunks.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContentChunk])],
  providers: [ContentChunksService],
  exports: [ContentChunksService],
})
export class ContentChunksModule {}
