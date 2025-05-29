import { FileEntity } from 'src/files/file.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('file_contents')
export class FileContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => FileEntity, (file) => file.fileContent, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  file: FileEntity;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
