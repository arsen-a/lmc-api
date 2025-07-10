import { Exclude, Expose } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserChange } from './user-change.entity';

@Entity('users')
export class User {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column()
  firstName: string;

  @Expose()
  @Column()
  lastName: string;

  @Expose()
  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Exclude()
  @Column({ default: false })
  isVerified: boolean;

  @Exclude()
  @OneToMany(() => UserChange, (change) => change.user, { cascade: true })
  changes: UserChange[];

  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  lastVerificationSentAt: Date;
}
