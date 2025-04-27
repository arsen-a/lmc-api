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

@Entity()
export class Collab {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Exclude()
  @OneToMany(() => CollabUser, (cu: CollabUser) => cu.collab)
  collabUsers: CollabUser[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
