import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Config } from 'src/config/config.type';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const mailConfig = this.configService.get<Config['mail']>('mail');
    if (!mailConfig) {
      throw new Error('Mail configuration is not defined');
    }
    const isMailTls = this.configService.get<string>('app.url')?.startsWith('https') ?? false;

    const auth =
      mailConfig.user && mailConfig.pass
        ? {
            user: mailConfig.user,
            pass: mailConfig.pass,
          }
        : undefined;

    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: isMailTls,
      auth,
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const appUrl = this.configService.get<string>('app.url');
    if (!appUrl) {
      throw new Error('APP_URL is not defined');
    }
    const url = `${appUrl}/api/auth/verify?token=${token}`;

    await this.transporter.sendMail({
      to,
      subject: 'Verify your email',
      html: `<p>Please <a href="${url}">click here</a> to verify your account.</p>`,
    });
  }
}
