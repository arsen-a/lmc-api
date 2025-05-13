import databaseConfig from './config/database.config';
import googleConfig from './config/google.config';
import appConfig from './config/app.config';
import mailConfig from './config/mail.config';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailService } from './mail/mail.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Config } from './config/config.type';
import { CollabsModule } from './collabs/collabs.module';
import { User } from './users/entities/user.entity';
import { Collab } from './collabs/entities/collab.entity';
import { CollabUser } from './collabs/entities/collab-user.entity';
import { FilesModule } from './files/files.module';
import { FileEntity } from './files/files.entity';
import { ContentChunksModule } from './content-chunks/content-chunks.module';
import { ContentChunk } from './content-chunks/content-chunks.entity';
import { VectorStoreModule } from './vector-store/vector-store.module';
import milvusConfig from './config/milvus.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [googleConfig, databaseConfig, appConfig, mailConfig, milvusConfig],
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
          entities: [User, Collab, CollabUser, FileEntity, ContentChunk],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CollabsModule,
    FilesModule,
    ContentChunksModule,
    VectorStoreModule,
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {}
