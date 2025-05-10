import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './files.entity';

// For local storage (replace with S3 logic later)
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames
import { ContentChunk } from 'src/content-chunks/content-chunks.entity';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly localUploadPath = path.resolve('./uploads');

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly configService: ConfigService,
  ) {}

  private async ensureDirectoryExists(directoryPath: string): Promise<void> {
    try {
      await fs.mkdir(directoryPath, { recursive: true });
    } catch {
      // Decide if this should prevent startup or just log
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    relatedModelName: string,
    relatedModelId: string,
  ): Promise<FileEntity> {
    if (!file) {
      throw new InternalServerErrorException('File data is missing.');
    }

    let filePath: string;

    try {
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const storagePath = path.join(
        this.localUploadPath,
        relatedModelName,
        relatedModelId,
      );
      filePath = path.join(storagePath, uniqueFilename);

      await this.ensureDirectoryExists(storagePath);
      await fs.writeFile(filePath, file.buffer);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to store uploaded file: ${error}`,
      );
    }

    const contentChunks: ContentChunk[] = [];

    if (file.mimetype === 'text/plain') {
      const content = file.buffer.toString('utf-8');
      const cleanedContent = content.replace(/\s+/g, ' ').trim();
      const chunk = new ContentChunk();
      chunk.content = cleanedContent;
      contentChunks.push(chunk);
    }

    try {
      const newFile = this.fileRepository.create({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath, // Path or Key from storage logic
        userId,
        relatedModelId,
        relatedModelName,
        contentChunks,
      });

      const savedFile = await this.fileRepository.save(newFile);

      const googleClient = new GoogleGenAI({
        apiKey: this.configService.get('google.geminiApiKey'),
      });

      const milvusClient = new MilvusClient({
        address: this.configService.get('milvus.uri') ?? '',
        token: this.configService.get('milvus.token') ?? '',
      });

      const { embeddings } = await googleClient.models.embedContent({
        model: 'gemini-embedding-exp-03-07',
        contents: contentChunks.map((chunk) => chunk.content),
        config: {
          taskType: 'SEMANTIC_SIMILARITY',
        },
      });

      this.logger.log(embeddings);

      const vectorRecords =
        embeddings?.map((embedding, index) => {
          // embedding.values;
          return {
            id: contentChunks[index].id,
            vector: embedding,
            metadata: {
              content: contentChunks[index].content,
              fileId: savedFile.id,
              relatedModelId,
              relatedModelName,
            },
          };
        }) ?? [];

      await milvusClient.upsert({
        collection_name: 'collab_content_chunks_new',
        data: vectorRecords,
      });

      return savedFile;
    } catch (error) {
      this.logger.error(error);
      // Optional: Attempt to delete the physically stored file if DB save fails (cleanup)
      try {
        await fs.unlink(filePath); // Adjust for S3 if needed (deleteObject)
        this.logger.warn(`Cleaned up stored file after DB error: ${filePath}`);
      } catch (cleanupError) {
        this.logger.error(
          `Failed to cleanup stored file after DB error: ${filePath}`,
          cleanupError,
        );
      }
      throw new InternalServerErrorException('Failed to save file metadata.');
    }
  }

  async findFilesForModel(
    relatedModelId: string,
    relatedModelName: string,
  ): Promise<FileEntity[]> {
    // Implementation assumed to exist
    return this.fileRepository.find({
      where: { relatedModelId, relatedModelName },
    });
  }
}
