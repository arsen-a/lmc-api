import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TabCacheDto } from '../controllers/tabs-cache.dto';
import { Collab } from 'src/collabs/entities/collab.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class TabsCacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private getKey(userId: string): string {
    return `tabs:${userId}`;
  }

  async getOpenTabs(userId: string): Promise<TabCacheDto[]> {
    const tabs = await this.cacheManager.get<TabCacheDto[]>(this.getKey(userId));
    return tabs || [];
  }

  async addTab(userId: string, tab: TabCacheDto): Promise<void> {
    const key = this.getKey(userId);
    const tabs = (await this.cacheManager.get<TabCacheDto[]>(key)) || [];

    if (tabs.length >= 10) {
      throw new BadRequestException('Maximum open tabs limit reached.');
    }

    tabs.push(tab);
    await this.cacheManager.set(key, tabs);
  }

  async removeTab(userId: string, tabId: string): Promise<void> {
    const key = this.getKey(userId);
    const tabs = (await this.cacheManager.get<TabCacheDto[]>(key)) || [];

    const updatedTabs = tabs.filter((tab) => tab.id !== tabId);
    await this.cacheManager.set(key, updatedTabs);
  }

  async removeTabsForCollab(user: User, collab: Collab): Promise<void> {
    const key = this.getKey(user.id);
    const tabs = await this.getOpenTabs(user.id);
    const updatedTabs = tabs.filter((tab) => tab.link.includes(collab.id));
    await this.cacheManager.set(key, updatedTabs);
  }
}
