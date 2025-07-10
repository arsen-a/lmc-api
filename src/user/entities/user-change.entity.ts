import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum UserChangeType {
  Email = 'email',
  Password = 'password',
}

@Entity('user_changes')
@Index('idx_type_token', ['type', 'token'], { unique: true })
export class UserChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.changes, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: UserChangeType,
  })
  type: UserChangeType;

  @Column()
  token: string;

  @Column()
  newValue: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, default: null })
  confirmedAt: Date;
}
