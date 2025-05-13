import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collab } from './entities/collab.entity';
import { CollabUser } from './entities/collab-user.entity';
import { CollabsService } from './collabs.service';
import { CollabController } from './collabs.controller';
import { CollabAbilityFactory } from './policies/collabs-ability.factory';
import { User } from 'src/users/entities/user.entity';
import { FilesModule } from 'src/files/files.module';
import { FileEntity } from 'src/files/files.entity';
import { ContentChunksModule } from 'src/content-chunks/content-chunks.module';
import { VectorStoreModule } from 'src/vector-store/vector-store.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collab, CollabUser, User, FileEntity]),
    FilesModule,
    ContentChunksModule,
    VectorStoreModule,
  ],
  providers: [
    CollabsService,
    {
      provide: 'ABILITY_FACTORY',
      useClass: CollabAbilityFactory,
    },
  ],
  controllers: [CollabController],
  exports: [CollabsService],
})
export class CollabsModule {}
