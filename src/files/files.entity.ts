import { Expose } from 'class-transformer';
import { ContentChunk } from 'src/content-chunks/content-chunks.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('files')
@Index('idx_files_related_model', ['relatedModelName', 'relatedModelId'])
@Index('idx_files_user', ['userId'])
export class FileEntity {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'NO ACTION',
    eager: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ name: 'userId', nullable: false })
  userId: string;

  @Column({ length: 50, nullable: false })
  relatedModelName: string;

  @Column({ length: 36, nullable: false }) // Length of UUIDs
  relatedModelId: string;

  @Column({ nullable: false })
  mimeType: string;

  @Column({ nullable: false })
  originalName: string;

  @Column({ nullable: false })
  path: string;

  @Column({ type: 'bigint', unsigned: true })
  size: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ContentChunk, (contentChunk) => contentChunk.file, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  contentChunks?: ContentChunk[];
}
