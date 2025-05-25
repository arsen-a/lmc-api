import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ContentChunk } from './content-chunks.entity';
import { Repository } from 'typeorm';
import { FilesService } from 'src/files/files.service';
import { User } from 'src/users/entities/user.entity';
import { Collab } from 'src/collabs/entities/collab.entity';
import { RecursiveCharacterTextSplitter, TextSplitter } from '@langchain/textsplitters';
import { PdfHelperService } from 'src/shared/services/pdf-helper.service';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ConfigService } from '@nestjs/config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export const CHUNK_SIZE = 2500;
export const CHUNK_OVERLAP = 500;

@Injectable()
export class ContentChunksService {
  private textSplitter: TextSplitter;

  constructor(
    @InjectRepository(ContentChunk)
    private readonly contentChunkRepository: Repository<ContentChunk>,
    private readonly filesService: FilesService,
    private readonly pdfHelperService: PdfHelperService,
    private readonly configService: ConfigService,
  ) {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });
  }

  private async chunkDocument(text: string) {
    const documents = await this.textSplitter.createDocuments([text]);
    return documents.map(({ pageContent }) => pageContent);
  }

  private collectPlainTextContent(rawFile: Express.Multer.File): string {
    const content = rawFile.buffer.toString('utf-8');
    return content.replace(/\s+/g, ' ').trim();
  }

  private async collectPdfDocumentContent(rawFile: Express.Multer.File) {
    const b64Images = (await this.pdfHelperService.convertPdfToPng(rawFile.buffer)).map(
      (str) => `data:image/png;base64,${str}`,
    );

    const llm = new ChatGoogleGenerativeAI({
      apiKey: this.configService.get<string>('ai.geminiApiKey'),
      model: 'gemini-2.0-flash',
      temperature: 0,
    });
    const response = await llm.invoke([
      new SystemMessage({
        content: `You are a text extracting assistant.
        You will receive only images as input from users and you have to respond with extracted text ONLY and nothing else.
        Do not try to summarize images, skip them.
        Extract only textual and table data you see.`,
      }),
      new HumanMessage({
        content: b64Images.map((image_url) => ({
          type: 'image_url',
          image_url,
        })),
      }),
    ]);

    return response.content as string;
  }

  /**
   * Chunks the content of an uploaded collaboration file and saves it to the database.
   *
   * @param {object} data - The data object containing the file, user, and collaboration details.
   * @param {Express.Multer.File} data.file - The uploaded file object from Multer.
   * @param {User} data.user - The user initiating the upload.
   * @param {Collab} data.collab - The collaboration entity associated with the file.
   * @returns {Promise<ContentChunk[]>} A promise that resolves to an array of saved ContentChunk entities.
   * @throws {InternalServerErrorException} If an error occurs while saving content to the database.
   */
  async chunkCollabFileContent(data: {
    file: Express.Multer.File;
    user: User;
    collab: Collab;
  }): Promise<ContentChunk[]> {
    const { file, user, collab } = data;
    const savedFile = await this.filesService.uploadFile(file, user, Collab.name, collab.id);

    let extractedContents: string = '';
    const mimeType = file.mimetype;

    if (mimeType === 'text/plain') {
      extractedContents = this.collectPlainTextContent(file);
    }

    if (mimeType == 'application/pdf') {
      extractedContents = await this.collectPdfDocumentContent(file);
    }

    if (!extractedContents.length) {
      return [];
    }

    const chunkedContents = await this.chunkDocument(extractedContents);

    const contentChunks = chunkedContents.map((strChunk) => {
      const chunk = new ContentChunk();
      chunk.file = savedFile;
      chunk.content = strChunk;
      return chunk;
    });

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
