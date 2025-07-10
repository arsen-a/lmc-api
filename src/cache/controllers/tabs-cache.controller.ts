import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Inject,
  Param,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TabCacheDto } from './tabs-cache.dto';

@Controller('cache/tabs')
@UseGuards(JwtAuthGuard)
export class TabsCacheController {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private getKey(userId: string): string {
    return `tabs:${userId}`;
  }

  @Get()
  async getOpenTabs(@Request() req: AuthenticatedRequest): Promise<TabCacheDto[]> {
    const userId = req.user.id;
    const tabs = await this.cacheManager.get<TabCacheDto[]>(this.getKey(userId));
    return tabs || [];
  }

  @Post()
  @HttpCode(201)
  async addTab(@Request() req: AuthenticatedRequest, @Body() body: TabCacheDto): Promise<void> {
    const key = this.getKey(req.user.id);
    const tabs = (await this.cacheManager.get<TabCacheDto[]>(key)) || [];

    if (tabs.length >= 10) {
      throw new BadRequestException('Maximum open tabs limit reached.');
    }

    tabs.push(body);
    await this.cacheManager.set(key, tabs);
  }

  @Delete(':id')
  @HttpCode(204)
  async removeTab(@Request() req: AuthenticatedRequest, @Param('id') id: string): Promise<void> {
    const key = this.getKey(req.user.id);
    const tabs = (await this.cacheManager.get<TabCacheDto[]>(key)) || [];

    const updatedTabs = tabs.filter((tab) => tab.id !== id);
    await this.cacheManager.set(key, updatedTabs);
  }
}
