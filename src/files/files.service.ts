import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './file.entity';
import { Collab } from 'src/collabs/entities/collab.entity';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PdfHelperService } from 'src/shared/services/pdf-helper.service';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ConfigService } from '@nestjs/config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
// For local storage (replace with S3 logic later)
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { isUUID } from 'class-validator';
import { User } from 'src/users/entities/user.entity';
import { FileContent } from './file-contents.entity';

export const FILE_CHUNK_SIZE = 2500;
export const FILE_CHUNK_OVERLAP = 500;

export interface SaveExtractChunkFileReturn {
  fileContent: FileContent;
  extractedContentChunks: string[];
}
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly localUploadPath = path.resolve('./uploads');
  private readonly textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: FILE_CHUNK_SIZE,
    chunkOverlap: FILE_CHUNK_OVERLAP,
  });

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(FileContent)
    private readonly fileContentRepository: Repository<FileContent>,
    private readonly pdfHelperService: PdfHelperService,
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
    user: User,
    relatedModelName: string,
    relatedModelId: string,
  ): Promise<FileEntity> {
    const idsValid = [user.id, relatedModelId].every((id) => isUUID(id));
    if (!idsValid || !file || !relatedModelName) {
      throw new UnprocessableEntityException('Needed metadata not provided');
    }

    let filePath: string;

    try {
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const storagePath = path.join(this.localUploadPath, relatedModelName, relatedModelId);
      filePath = path.join(storagePath, uniqueFilename);

      await this.ensureDirectoryExists(storagePath);
      await fs.writeFile(filePath, file.buffer);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to store uploaded file: ${error}`);
    }

    try {
      const newFile = this.fileRepository.create({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        user,
        relatedModelId,
        relatedModelName,
      });

      return await this.fileRepository.save(newFile);
    } catch (error) {
      this.logger.error(error);
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

    const extractResponses = await Promise.all(
      b64Images.map((image_url) =>
        llm.invoke([
          new SystemMessage({
            content: `You are a text extracting assistant.
        You receive only image as input from user(s) and you have to respond with extracted text ONLY and nothing else.
        Do not try to summarize images, skip them.
        Extract only textual and table data you see.`,
          }),
          new HumanMessage({
            content: [
              {
                type: 'image_url',
                image_url,
              },
            ],
          }),
        ]),
      ),
    );

    return extractResponses.map((resp) => resp.content as string).join('/n/n');
  }

  async saveExtractChunkFile(data: {
    file: Express.Multer.File;
    user: User;
    collab: Collab;
  }): Promise<SaveExtractChunkFileReturn | null> {
    const { file, user, collab } = data;
    const savedFile = await this.uploadFile(file, user, Collab.name, collab.id);

    let extractedContents: string = '';
    const mimeType = file.mimetype;

    if (mimeType === 'text/plain') {
      extractedContents = this.collectPlainTextContent(file);
    }

    if (mimeType == 'application/pdf') {
      extractedContents = await this.collectPdfDocumentContent(file);
    }

    if (!extractedContents.length) {
      return null;
    }

    const extractedContentChunks = await this.chunkDocument(extractedContents);

    const fileContent = new FileContent();
    fileContent.file = savedFile;
    fileContent.content = extractedContents;

    try {
      const savedFileContent = await this.fileContentRepository.save(fileContent);

      return {
        fileContent: savedFileContent,
        extractedContentChunks,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error saving file content to the database',
        String(error),
      );
    }
  }
}
