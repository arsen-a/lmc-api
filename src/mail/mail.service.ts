import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Config } from 'src/config/config.type';
import { UserChangeType } from 'src/user/entities/user-change.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private appUrl: string;

  constructor(private configService: ConfigService) {
    const mailConfig = this.configService.get<Config['mail']>('mail');
    const appUrl = this.configService.get<string>('app.url');
    if (!mailConfig) {
      throw new Error('Mail configuration is not defined');
    }
    if (!appUrl) {
      throw new Error('APP_URL is not defined');
    }

    this.appUrl = appUrl;
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
    const url = `${this.appUrl}/api/auth/verify?token=${token}`;

    await this.transporter.sendMail({
      to,
      subject: 'Verify your email',
      html: `<p>Please <a href="${url}">click here</a> to verify your account.</p>`,
    });
  }

  async sendSecureEmailChange(data: {
    user: User;
    token: string;
    recipient: string;
    type: UserChangeType;
  }) {
    const url = `${this.appUrl}/api/users/secure-update/verify?token=${data.token}&type=${data.type}`;

    await this.transporter.sendMail({
      to: data.recipient,
      subject: 'Email Change Requested',
      html: `<p>Hi ${data.user.firstName},</p>
             <p>We received a request to change your email address. If you did not make this request, please ignore this email.</p>
             <p>If you did make this request, please <a href="${url}">click here</a> to confirm the change.</p>
             <p>If you have any questions, feel free to contact our support team.</p>
             <p>Best regards,</p>
             <p>Your Team</p>`,
    });
  }

  async sendNewPasswordChange(data: { user: User; token: string; type: UserChangeType }) {
    const url = `${this.appUrl}/api/users/secure-update/verify?token=${data.token}&type=${data.type}`;

    await this.transporter.sendMail({
      to: data.user.email,
      subject: 'Password Change Requested',
      html: `<p>Hi ${data.user.firstName},</p>
             <p>We received a request to change your password. If you did not make this request, please ignore this email.</p>
             <p>If you did make this request, please <a href="${url}">click here</a> to set a new password.</p>
             <p>If you have any questions, feel free to contact our support team.</p>
             <p>Best regards,</p>
             <p>Your Team</p>`,
    });
  }
}
