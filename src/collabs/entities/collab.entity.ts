import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CollabUser } from './collab-user.entity';
import { Exclude } from 'class-transformer';

@Entity('collabs')
export class Collab {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, length: 50, default: 'Untitled Topic' })
  title: string;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Exclude()
  @OneToMany(() => CollabUser, (cu: CollabUser) => cu.collab)
  collabUsers: CollabUser[];

  @Column({ default: false })
  private: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
