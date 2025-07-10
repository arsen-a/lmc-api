import databaseConfig from 'src/config/database.config';
import googleConfig from 'src/config/google.config';
import appConfig from 'src/config/app.config';
import mailConfig from 'src/config/mail.config';
import { Config } from 'src/config/config.type';
import milvusConfig from 'src/config/milvus.config';
import aiConfig from 'src/config/ai.config';
import { Module } from '@nestjs/common';
import { AppController } from 'src/app/app.controller';
import { AppService } from 'src/app/app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CollabsModule } from 'src/collabs/collabs.module';
import { User } from 'src/user/entities/user.entity';
import { Collab } from 'src/collabs/entities/collab.entity';
import { CollabUser } from 'src/collabs/entities/collab-user.entity';
import { FilesModule } from 'src/files/files.module';
import { FileEntity } from 'src/files/file.entity';
import { VectorStoreModule } from 'src/vector-store/vector-store.module';
import { SharedModule } from 'src/shared/shared.module';
import { FileContent } from 'src/files/file-contents.entity';
import { CacheModule } from 'src/cache/cache.module';
import redisConfig from 'src/config/redis.config';
import { UserChange } from 'src/user/entities/user-change.entity';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 0, limit: 0 }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        googleConfig,
        databaseConfig,
        appConfig,
        mailConfig,
        milvusConfig,
        aiConfig,
        redisConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const dbConfig = config.get<Config['database']>('database');
        if (!dbConfig) {
          throw new Error('Database configuration is not set');
        }
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.name,
          entities: [User, UserChange, Collab, CollabUser, FileEntity, FileContent],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    CollabsModule,
    FilesModule,
    VectorStoreModule,
    SharedModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
