import { FileEntity } from 'src/files/files.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('content_chunks')
export class ContentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => FileEntity, (file) => file.contentChunks, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  file: FileEntity;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
