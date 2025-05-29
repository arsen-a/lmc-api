import { Module } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileContent } from 'src/files/file-contents.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FileContent])],
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
