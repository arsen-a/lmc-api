import { Module } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentChunk } from 'src/content-chunks/content-chunks.entity';
import { ContentChunksModule } from '../content-chunks/content-chunks.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContentChunk]), ContentChunksModule],
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
