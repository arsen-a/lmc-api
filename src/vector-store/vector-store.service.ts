import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { ConfigService } from '@nestjs/config';
import { FileEntity } from 'src/files/files.entity';
import { ContentChunk } from 'src/content-chunks/content-chunks.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class VectorStoreService {
  private readonly googleClient: GoogleGenAI;
  private readonly milvusClient: MilvusClient;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ContentChunk)
    private readonly contentChunkRepository: Repository<ContentChunk>,
  ) {
    this.googleClient = new GoogleGenAI({
      apiKey: this.configService.get('google.geminiApiKey'),
    });

    this.milvusClient = new MilvusClient({
      address: this.configService.get('milvus.uri') ?? '',
      token: this.configService.get('milvus.token') ?? '',
    });
  }

  async createChunksAndEmbeddings(data: {
    rawFile: Express.Multer.File;
    savedFile: FileEntity;
    relatedModelId: string;
    relatedModelName: string;
  }) {
    const { savedFile, relatedModelId, relatedModelName, rawFile } = data;

    const contentChunks: ContentChunk[] = [];

    if (rawFile.mimetype === 'text/plain') {
      const content = rawFile.buffer.toString('utf-8');
      const cleanedContent = content.replace(/\s+/g, ' ').trim();
      const chunk = new ContentChunk();
      chunk.file = savedFile;
      chunk.content = cleanedContent;
      contentChunks.push(chunk);
    }

    if (!contentChunks.length) {
      return;
    }

    let createdContentChunks: ContentChunk[];

    try {
      createdContentChunks =
        await this.contentChunkRepository.manager.transaction(
          async (transactionalEntityManager) => {
            return await transactionalEntityManager.save(
              ContentChunk,
              contentChunks,
            );
          },
        );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error saving content chunks to the database',
        String(error),
      );
    }

    const { embeddings } = await this.googleClient.models.embedContent({
      model: 'gemini-embedding-exp-03-07',
      contents: createdContentChunks.map((chunk) => chunk.content),
      config: {
        taskType: 'SEMANTIC_SIMILARITY',
      },
    });

    if (embeddings === undefined) {
      throw new InternalServerErrorException(
        'Error generating embeddings for file',
      );
    }

    const vectorRecords = embeddings.map((embedding, index) => {
      const chunk = createdContentChunks[index];
      return {
        id: chunk.id,
        vector: embedding.values,
        metadata: {
          content: chunk.content,
          fileId: savedFile.id,
          relatedModelId,
          relatedModelName,
        },
      };
    });

    await this.milvusClient.upsert({
      collection_name: 'collab_content_chunks',
      data: vectorRecords,
    });
  }
}
