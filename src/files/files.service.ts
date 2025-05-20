import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './files.entity';

// For local storage (replace with S3 logic later)
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { isUUID } from 'class-validator';
import { User } from 'src/users/entities/user.entity';

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

  async findFilesForModel(
    relatedModelId?: string,
    relatedModelName?: string,
  ): Promise<FileEntity[]> {
    if (!relatedModelId || !relatedModelName || !isUUID(relatedModelId)) {
      throw new NotFoundException('Requested resource is missing');
    }

    return this.fileRepository.find({
      where: { relatedModelId, relatedModelName },
    });
  }
}
