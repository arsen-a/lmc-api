import { Exclude, Expose } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Expose()
  @Column({ default: false })
  isVerified: boolean;

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
