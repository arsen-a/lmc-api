import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FileContent } from './file-contents.entity';

@Entity('files')
@Index('idx_files_related_model', ['relatedModelName', 'relatedModelId'])
@Index('idx_files_user', ['userId'])
export class FileEntity {
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

  @Column({ nullable: true, length: 500 })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => FileContent, (content) => content.file, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  fileContent?: FileContent;
}
