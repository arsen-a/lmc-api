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
  // FileTypeValidator,
  Param,
} from '@nestjs/common';
import { CollabsService } from './collabs.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { CreateCollabDto } from './collabs.dto';
import { Request } from 'express';
import { Collab } from './entities/collab.entity';
import { CheckAbilities } from 'src/auth/decorators/check-abilities.decorator';
import { PoliciesGuard } from 'src/auth/guards/policies.guard';
import { CollabActions } from './policies/collabs-ability.factory';
import { CollabContextGuard } from './guards/collab-context.guard';
import { plainToInstance } from 'class-transformer';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/users/entities/user.entity';
import { FileEntity } from 'src/files/files.entity';
import { FilesService } from 'src/files/files.service';

// const allowedFileTypes =
//   /(?:application\/pdf|image\/jpeg|image\/png|image\/heic|text\/plain)$/i;

@Controller('collabs')
@UseGuards(JwtAuthGuard, CollabContextGuard, PoliciesGuard)
export class CollabController {
  constructor(
    private readonly collabsService: CollabsService,
    private readonly filesService: FilesService,
  ) {}

  @Get()
  async index(@Req() req: Request & { user: { userId: string } }) {
    const data = await this.collabsService.getCollabsForUser(req.user.userId);
    return plainToInstance(Collab, data);
  }

  @Post()
  async create(
    @Body() dto: CreateCollabDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    const data = await this.collabsService.createCollab({
      title: dto.title,
      description: dto.description,
      userId: req.user.userId,
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
  @CheckAbilities<CollabActions, typeof Collab>({
    action: 'contribute',
    subject: Collab,
  })
  @HttpCode(HttpStatus.CREATED)
  async addContent(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          // new FileTypeValidator({ fileType: allowedFileTypes }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: Request & { subject: Collab; user: User },
  ): Promise<FileEntity> {
    const user = req.user;
    const collab = req.subject;

    const savedFileEntity = await this.filesService.uploadFile(
      file,
      user.id,
      Collab.name,
      collab.id,
    );

    // 1. extract the content out of the file
    // 2. store the whole content of the collab contribution
    // 3. store chunks of the the content
    // 4. create embeddings and push to zilliz

    return savedFileEntity;
  }
}
