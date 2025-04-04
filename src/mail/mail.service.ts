import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: 'mailpit', // Service name in docker-compose
    port: 1025,
    secure: false, // Mailpit does not use TLS by default
  });

  async sendVerificationEmail(to: string, token: string) {
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}/api/auth/verify?token=${token}`;
    await this.transporter.sendMail({
      to,
      subject: 'Verify your email',
      html: `<p>Please <a href="${url}">click here</a> to verify your account.</p>`,
    });
  }
}
