import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Collab } from './entities/collab.entity';
import { CollabUser, CollabRole } from './entities/collab-user.entity';
import { User } from 'src/user/entities/user.entity';
import { isUUID } from 'class-validator';
import { FileEntity } from 'src/files/file.entity';

@Injectable()
export class CollabsService {
  constructor(
    @InjectRepository(Collab)
    private readonly collabRepo: Repository<Collab>,
    @InjectRepository(CollabUser)
    private readonly collabUserRepo: Repository<CollabUser>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
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
}
