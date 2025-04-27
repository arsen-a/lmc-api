import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Param,
  Get,
} from '@nestjs/common';
import { CollabsService } from './collabs.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { CreateCollabDto } from './dto/create-collab.dto';
import { Request } from 'express';
import { Collab } from './entities/collab.entity';
import { CheckAbilities } from 'src/auth/decorators/check-abilities.decorator';
import { PoliciesGuard } from 'src/auth/guards/policies.guard';
import { CollabActions } from './policies/collabs-ability.factory';
import { CollabContextGuard } from './guards/collab-context.guard';
import { plainToInstance } from 'class-transformer';

@Controller('collabs')
@UseGuards(JwtAuthGuard, CollabContextGuard, PoliciesGuard)
export class CollabController {
  constructor(private readonly collabsService: CollabsService) {}

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
    return this.collabsService.createCollab({
      title: dto.title,
      description: dto.description,
      userId: req.user.userId,
    });
  }

  @Get(':collabId')
  @CheckAbilities<CollabActions, typeof Collab>({
    action: 'read',
    subject: Collab,
  })
  showCollab(
    @Param('collabId') collabId: string,
    @Req() req: Request & { subject: Collab },
  ) {
    return plainToInstance(Collab, req.subject);
  }

  @Patch(':collabId')
  @CheckAbilities<CollabActions, typeof Collab>({
    action: 'update',
    subject: Collab,
  })
  updateCollab(
    @Param('collabId') collabId: string,
    // @Body() dto: Record<string, string>,
  ) {
    console.log('collabId', collabId);
  }
}
