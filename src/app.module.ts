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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [googleConfig, databaseConfig, appConfig, mailConfig],
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
          entities: [User, Collab, CollabUser],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CollabsModule,
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {}
