import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  Param,
  UnprocessableEntityException,
  Sse,
  Delete,
} from '@nestjs/common';
import { CollabsService } from './collabs.service';
import { Request } from 'express';
import { Collab } from './entities/collab.entity';
import { CheckAbilities } from 'src/auth/decorators/check-abilities.decorator';
import { PoliciesGuard } from 'src/auth/guards/policies.guard';
import { CollabActions } from './policies/collabs-ability.factory';
import { CollabContextGuard } from './guards/collab-context.guard';
import { plainToInstance } from 'class-transformer';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileEntity } from 'src/files/file.entity';
import { VectorStoreService } from 'src/vector-store/vector-store.service';
import { map } from 'rxjs';
import { FilesService } from 'src/files/files.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserService } from 'src/user/user.service';
import { CollabPromptDto } from './dto/collab-prompt.dto';
import { CreateCollabDto } from './dto/create-collab.dto';
import { AddContentDto } from './dto/add-collab-content';

@Controller('collabs')
@UseGuards(JwtAuthGuard, CollabContextGuard, PoliciesGuard)
export class CollabController {
  constructor(
    private readonly collabsService: CollabsService,
    private readonly filesService: FilesService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly userService: UserService,
  ) {}

  @Get()
  async index(@Req() req: AuthenticatedRequest) {
    const data = await this.collabsService.getCollabsForUser(req.user);
    return plainToInstance(Collab, data);
  }

  @Post()
  async create(@Body() dto: CreateCollabDto, @Req() req: AuthenticatedRequest) {
    const data = await this.collabsService.createCollab({
      title: dto.title,
      description: dto.description,
      user: req.user,
    });
    return plainToInstance(Collab, data);
  }

  @Get(':collabId')
  @CheckAbilities<CollabActions, typeof Collab>({
    action: 'read',
    subject: Collab,
  })
  showCollab(@Req() req: Request & { subject: Collab }) {
    return plainToInstance(Collab, req.subject);
  }

  @Delete(':collabId')
  @CheckAbilities<CollabActions, typeof Collab>({
    action: 'delete',
    subject: Collab,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCollab(@Req() req: AuthenticatedRequest & { subject: Collab }) {
    await this.collabsService.deleteCollab(req.subject, req.user);
  }

  @Get(':collabId/content')
  @CheckAbilities<CollabActions, typeof Collab>({
    action: 'read',
    subject: Collab,
  })
  showCollabContent(@Param('collabId') collabId: string) {
    const content = this.collabsService.getCollabContent(collabId);
    return plainToInstance(FileEntity, content);
  }

  @Post(':collabId/content')
  @UseInterceptors(FileInterceptor('file'))
  @CheckAbilities<CollabActions, typeof Collab>({ action: 'contribute', subject: Collab })
  @HttpCode(HttpStatus.CREATED)
  async addContent(
    @Body() body: AddContentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @Req() req: AuthenticatedRequest & { subject: Collab },
  ) {
    const allowedMimeTypes = [
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/heic',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new UnprocessableEntityException(
        `Unsupported file type. Allowed types are: ${allowedMimeTypes.join(', ')}`,
      );
    }

    const collab = req.subject;

    const fileContentsData = await this.filesService.saveExtractChunkFile({
      payload: { ...body, file },
      user: req.user,
      collab,
    });

    if (fileContentsData === null) {
      // TODO: Handle this accordingly
      return;
    }

    await this.vectorStoreService.storeFileContentChunks(fileContentsData);
    return plainToInstance(FileEntity, fileContentsData.fileContent.file);
  }

  @Post(':collabId/prompt')
  @Sse()
  @CheckAbilities<CollabActions, typeof Collab>({ action: 'read', subject: Collab })
  prompt(@Param('collabId') collabId: string, @Body() promptRequestDto: CollabPromptDto) {
    return this.vectorStoreService
      .promptCollab(collabId, promptRequestDto.messages)
      .pipe(map((chunk) => ({ data: chunk.data }) as MessageEvent));
  }
}
