import { Module } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentChunk } from 'src/content-chunks/content-chunks.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContentChunk])],
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
