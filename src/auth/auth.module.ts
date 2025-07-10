import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { MailService } from 'src/mail/mail.service';
import { GoogleStrategy } from './strategies/google-auth.strategy';

@Module({
  imports: [PassportModule, UserModule],
  controllers: [AuthController],
  providers: [AuthService, MailService, GoogleStrategy],
})
export class AuthModule {}
