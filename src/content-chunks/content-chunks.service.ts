import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ContentChunk } from './content-chunks.entity';
import { Repository } from 'typeorm';
import { FilesService } from 'src/files/files.service';
import { User } from 'src/users/entities/user.entity';
import { Collab } from 'src/collabs/entities/collab.entity';
import { FileEntity } from 'src/files/files.entity';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export const CHUNK_SIZE = 2500;
export const CHUNK_OVERLAP = 500;

@Injectable()
export class ContentChunksService {
  constructor(
    @InjectRepository(ContentChunk)
    private contentChunkRepository: Repository<ContentChunk>,
    private filesService: FilesService,
  ) {}

  private async chunkDocument(text: string) {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });
    const documents = await textSplitter.createDocuments([text]);
    return documents.map(({ pageContent }) => pageContent);
  }

  private async collectPlainTextChunks(
    rawFile: Express.Multer.File,
    savedFile: FileEntity,
  ): Promise<Array<ContentChunk>> {
    const content = rawFile.buffer.toString('utf-8');
    const cleanedContent = content.replace(/\s+/g, ' ').trim();

    return (await this.chunkDocument(cleanedContent)).map((strChunk) => {
      const chunk = new ContentChunk();
      chunk.file = savedFile;
      chunk.content = strChunk;
      return chunk;
    });
  }

  async chunkCollabFileContent(data: {
    file: Express.Multer.File;
    user: User;
    collab: Collab;
  }): Promise<ContentChunk[]> {
    const savedFile = await this.filesService.uploadFile(
      data.file,
      data.user,
      Collab.name,
      data.collab.id,
    );

    const contentChunks: ContentChunk[] = [];

    if (data.file.mimetype === 'text/plain') {
      const chunks = await this.collectPlainTextChunks(data.file, savedFile);
      contentChunks.push(...chunks);
    }

    if (!contentChunks.length) {
      return [];
    }

    try {
      return await this.contentChunkRepository.manager.transaction(
        async (transactionalEntityManager) => {
          return await transactionalEntityManager.save(ContentChunk, contentChunks);
        },
      );
    } catch (error) {
      throw new InternalServerErrorException('Error saving content to the database', String(error));
    }
  }
}
