import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { CreateUserDto } from 'src/users/users.dto';
import { MailService } from 'src/mail/mail.service';
import { AuthTokenPayload } from 'src/auth/auth.types';
import { EncryptJWT, jwtDecrypt, JWTPayload } from 'jose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly PREAUTH_TOKEN_TTL = 3 * 60 * 1000; // 3 minutes in milliseconds
  private readonly AUTH_TOKEN_TTL = 3600 * 24 * 1000; // 1 day in milliseconds
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    const appSecret = this.configService.get<string>('app.secret', '');
    this.encryptionKey = Buffer.from(appSecret, 'base64');
  }

  async validateUser(email: string, pass: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }

  async login(user: Omit<User, 'password'>) {
    return {
      accessToken: await this.issueAuthToken(user),
    };
  }

  async register(dto: CreateUserDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user) {
      throw new BadRequestException('Email already exists');
    }
    const createdUser = await this.usersService.create(dto);

    const token = await this.issueAuthToken(createdUser);
    await this.mailService.sendVerificationEmail(createdUser.email, token);

    return {
      message: 'Verification email sent. Please check your inbox',
    };
  }

  async verifyEmail(token: string) {
    try {
      const { payload } = await jwtDecrypt<AuthTokenPayload>(token, this.encryptionKey);
      const user = await this.usersService.verifyUser(payload.email);
      return this.login(user);
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async resendVerificationEmail(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }

    const now = new Date();

    if (user.lastVerificationSentAt) {
      const diffMs = now.getTime() - user.lastVerificationSentAt.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes < 1) {
        throw new BadRequestException('Please wait before requesting another verification email');
      }
    }

    await this.usersService.updateVerificationTimestamp(user.email, now);
    const token = await this.issueAuthToken(user);
    await this.mailService.sendVerificationEmail(user.email, token);

    return {
      message: 'Verification email resent. Please check your inbox',
    };
  }

  async authenticateWithGoogle(profile: { email: string; firstName: string; lastName: string }) {
    const { email, firstName, lastName } = profile;
    const existing = await this.usersService.findByEmail(email);
    let user = existing;

    if (!user) {
      user = await this.usersService.create(
        {
          firstName,
          lastName,
          email,
          password: '',
        },
        true,
      );
    }

    return this.login(user);
  }

  async getPreauthData(email: string, ip: string) {
    const user = await this.usersService.findByEmail(email);
    const flow: 'login' | 'register' = user ? 'login' : 'register';
    const token = await this.issuePreauthToken(email, ip);

    return {
      flow,
      token,
    };
  }

  async issueJweToken<TData extends JWTPayload>(data: TData, ttl: Date): Promise<string> {
    return await new EncryptJWT(data)
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime(ttl)
      .encrypt(this.encryptionKey);
  }

  async issueAuthToken(user: Omit<User, 'password'>): Promise<string> {
    const expirationTime = new Date(Date.now() + this.AUTH_TOKEN_TTL);
    return await this.issueJweToken({ sub: user.id, email: user.email }, expirationTime);
  }

  async issuePreauthToken(email: string, ip: string): Promise<string> {
    const expirationTime = new Date(Date.now() + this.PREAUTH_TOKEN_TTL);
    return await this.issueJweToken({ email, ip }, expirationTime);
  }
}
