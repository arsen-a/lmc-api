import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Collab } from './entities/collab.entity';
import { CollabUser, CollabRole } from './entities/collab-user.entity';
import { User } from 'src/user/entities/user.entity';
import { isUUID } from 'class-validator';
import { FileEntity } from 'src/files/file.entity';
import { VectorStoreService } from 'src/vector-store/vector-store.service';
import { FilesService } from 'src/files/files.service';
import { TabsCacheService } from 'src/cache/services/tabs-cache.service';

@Injectable()
export class CollabsService {
  constructor(
    @InjectRepository(Collab)
    private readonly collabRepo: Repository<Collab>,
    @InjectRepository(CollabUser)
    private readonly collabUserRepo: Repository<CollabUser>,
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
    private readonly dataSource: DataSource,
    private readonly vectorStoreService: VectorStoreService,
    private readonly filesService: FilesService,
    private readonly tabsCacheService: TabsCacheService,
  ) {}

  async createCollab(data: { title: string; description?: string; user: User }): Promise<Collab> {
    const { title, description = '', user } = data;
    const collab = this.collabRepo.create({ title, description });
    const savedCollab = await this.collabRepo.save(collab);

    if (!user) {
      throw new InternalServerErrorException('User entity for the provided userId not found');
    }

    await this.collabUserRepo.save({
      collab: savedCollab,
      user,
      role: CollabRole.OWNER,
    });

    return savedCollab;
  }

  async findUserCollabRole(data: {
    user?: User;
    collabId?: string;
  }): Promise<{ collab: Collab | null; role: CollabRole | null }> {
    const { user, collabId } = data;

    if (!user || !collabId || !isUUID(collabId, '4')) {
      return { collab: null, role: null };
    }

    const [collab, collabUser] = await Promise.all([
      this.collabRepo.findOne({
        where: { id: collabId },
        loadEagerRelations: false,
      }),
      this.collabUserRepo.findOne({
        where: { user: { id: user.id }, collab: { id: collabId } },
      }),
    ]);

    if (!collab || !collabUser) {
      return { collab: null, role: null };
    }

    return { collab, role: collabUser.role };
  }

  async getCollabsForUser(user: User) {
    return this.collabRepo.find({
      where: {
        collabUsers: {
          user: { id: user.id },
          role: In(Object.values(CollabRole)),
        },
      },
      relations: ['collabUsers'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCollabContent(collabId: string) {
    if (!collabId || !isUUID(collabId)) {
      throw new NotFoundException();
    }

    return await this.fileRepo.find({
      where: {
        relatedModelName: Collab.name,
        relatedModelId: collabId,
      },
      relations: ['user'],
    });
  }

  async deleteCollab(collab: Collab, user?: User) {
    const collabId = collab.id;

    try {
      const collabFiles = await this.fileRepo.find({
        where: { relatedModelName: Collab.name, relatedModelId: collabId },
      });

      await this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
        await transactionalEntityManager.remove(FileEntity, collabFiles);
        await transactionalEntityManager.remove(Collab, collab);
      });

      await Promise.all([
        this.vectorStoreService.deleteForCollab(collabId),
        this.filesService.deleteUploadsForFiles(collabFiles),
        user ? this.tabsCacheService.removeTabsForCollab(user, collab) : null,
      ]);
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete collab', String(error));
    }
  }
}
