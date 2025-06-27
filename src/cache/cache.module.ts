import { Module } from '@nestjs/common';
import { CacheModule as CacheManagerModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { TabsCacheController } from './controllers/tabs-cache.controller';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config.type';

@Module({
  imports: [
    CacheManagerModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis') as NonNullable<Config['redis']>;
        const { host, password, port } = redisConfig;

        return {
          stores: [createKeyv(`redis://:${password}@${host}:${port}`)],
        };
      },
    }),
  ],
  controllers: [TabsCacheController],
})
export class CacheModule {}
