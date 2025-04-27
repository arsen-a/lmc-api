import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Collab } from './collab.entity';
import { User } from 'src/users/entities/user.entity';

export enum CollabRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

@Entity()
@Unique(['collab', 'user'])
export class CollabUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Collab, (collab) => collab.collabUsers, {
    onDelete: 'CASCADE',
  })
  collab: Collab;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: CollabRole, default: CollabRole.MEMBER })
  role: CollabRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
