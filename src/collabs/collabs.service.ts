import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Collab } from './entities/collab.entity';
import { CollabUser, CollabRole } from './entities/collab-user.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class CollabsService {
  constructor(
    @InjectRepository(Collab)
    private readonly collabRepo: Repository<Collab>,
    @InjectRepository(CollabUser)
    private readonly collabUserRepo: Repository<CollabUser>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createCollab(data: {
    title: string;
    description?: string;
    userId: string;
  }): Promise<Collab> {
    const { title, description = '', userId } = data;
    const collab = this.collabRepo.create({ title, description });
    const savedCollab = await this.collabRepo.save(collab);
    const creator = await this.userRepo.findOne({
      where: { id: userId },
      loadEagerRelations: false,
    });

    if (!creator) {
      throw new InternalServerErrorException(
        'User entity for the provided userId not found',
      );
    }

    await this.collabUserRepo.save({
      collab: savedCollab,
      user: creator,
      role: CollabRole.OWNER,
    });

    return savedCollab;
  }

  async findUserCollabRole(data: {
    userId?: string;
    collabId?: string;
  }): Promise<{ collab: Collab | null; role: CollabRole | null }> {
    const { userId, collabId } = data;

    if (!userId || !collabId) {
      return { collab: null, role: null };
    }

    const [collab, collabUser] = await Promise.all([
      this.collabRepo.findOne({
        where: { id: collabId },
        loadEagerRelations: false,
      }),
      this.collabUserRepo.findOne({
        where: { user: { id: userId }, collab: { id: collabId } },
      }),
    ]);

    if (!collab || !collabUser) {
      return { collab: null, role: null };
    }

    return { collab, role: collabUser.role };
  }

  async getCollabsForUser(userId: User['id']) {
    return this.collabRepo.find({
      where: {
        collabUsers: {
          user: { id: userId },
          role: In(Object.values(CollabRole)),
        },
      },
      relations: ['collabUsers'],
    });
  }
}
