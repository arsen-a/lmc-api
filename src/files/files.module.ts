import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './file.entity';
import { FileContent } from './file-contents.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity, FileContent])],
  providers: [FilesService],
  exports: [FilesService, TypeOrmModule.forFeature([FileContent])],
})
export class FilesModule {}
