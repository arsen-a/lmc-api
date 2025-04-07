import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/entities/user.entity';
import { omit } from 'lodash';
import { CreateUserDto } from 'src/auth/dto/create-user.dto';
import { MailService } from 'src/mail/mail.service';
import { JwtPayload } from 'src/user/types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      if (!user.isVerified) {
        throw new UnauthorizedException(
          'Please verify your email before logging in',
        );
      }
      const result = omit(user, ['password']);
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  login(user: Omit<User, 'password'>) {
    const payload = { email: user.email, sub: user.id };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(dto: CreateUserDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (user) {
      throw new BadRequestException('Email already exists');
    }
    const createdUser = await this.userService.create(dto);

    const token = this.jwtService.sign(
      { email: createdUser.email },
      { expiresIn: '1d' },
    );
    await this.mailService.sendVerificationEmail(createdUser.email, token);

    return {
      message: 'Please check your email to verify your account.',
    };
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      await this.userService.verifyByEmail(payload.email);
      return { message: 'Email successfully verified' };
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async resendVerificationEmail(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    const now = new Date();

    if (user.lastVerificationSentAt) {
      const diffMs = now.getTime() - user.lastVerificationSentAt.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes < 1) {
        throw new BadRequestException(
          'Please wait before requesting another verification email',
        );
      }
    }

    await this.userService.updateVerificationTimestamp(user.email, now);

    const token = this.jwtService.sign(
      { email: user.email },
      { expiresIn: '1d' },
    );

    await this.mailService.sendVerificationEmail(user.email, token);

    return {
      message: 'Verification email resent. Please check your inbox',
    };
  }

  async loginWithGoogle(profile: { email: string; sub: string }) {
    const existing = await this.userService.findByEmail(profile.email);
    let user = existing;

    if (!user) {
      user = await this.userService.create({
        email: profile.email,
        password: '', // not used
        isVerified: true,
      });
    }

    return this.login(user);
  }
}
