import { Module } from '@nestjs/common';
import { ContentChunksService } from './content-chunks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentChunk } from './content-chunks.entity';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContentChunk]), FilesModule],
  providers: [ContentChunksService],
  exports: [ContentChunksService],
})
export class ContentChunksModule {}
