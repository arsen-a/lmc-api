import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TabCacheDto } from './tabs-cache.dto';
import { TabsCacheService } from '../services/tabs-cache.service';

@Controller('cache/tabs')
@UseGuards(JwtAuthGuard)
export class TabsCacheController {
  constructor(private tabsCacheService: TabsCacheService) {}

  @Get()
  async getOpenTabs(@Request() req: AuthenticatedRequest): Promise<TabCacheDto[]> {
    return this.tabsCacheService.getOpenTabs(req.user.id);
  }

  @Post()
  @HttpCode(201)
  async addTab(@Request() req: AuthenticatedRequest, @Body() body: TabCacheDto): Promise<void> {
    return this.tabsCacheService.addTab(req.user.id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async removeTab(@Request() req: AuthenticatedRequest, @Param('id') id: string): Promise<void> {
    return this.tabsCacheService.removeTab(req.user.id, id);
  }
}
