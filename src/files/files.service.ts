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

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly localUploadPath = path.resolve('./uploads');

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
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

    // --- Storage Logic (Local for now) ---
    // TODO: Replace this section with your S3/Cloud Storage logic later
    try {
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const storagePath = path.join(this.localUploadPath, relatedModelName);
      filePath = path.join(storagePath, uniqueFilename);

      await this.ensureDirectoryExists(storagePath);
      await fs.writeFile(filePath, file.buffer);

      // In a real scenario with S3, 'storagePath' would become the S3 Object Key,
      // and the local temporary file might not be needed or should be cleaned up.
      // Example:
      // const s3Key = `collab_content/${uniqueFilename}`;
      // await this.s3StorageService.upload(file.buffer, s3Key, file.mimetype);
      // storagePath = s3Key; // Save the S3 key as the path
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to store uploaded file: ${error}`,
      );
    }
    // --- End Storage Logic ---

    try {
      const newFile = this.fileRepository.create({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath, // Path or Key from storage logic
        userId,
        relatedModelId,
        relatedModelName,
      });

      const savedFile = await this.fileRepository.save(newFile);
      return savedFile;
    } catch {
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
