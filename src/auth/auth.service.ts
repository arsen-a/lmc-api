import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { CreateUserDto } from 'src/users/users.dto';
import { MailService } from 'src/mail/mail.service';
import { JwtPayload } from 'src/auth/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      if (!user.isVerified) {
        throw new UnauthorizedException('Please verify your email before logging in');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = user;
      return rest;
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
    const user = await this.usersService.findByEmail(dto.email);
    if (user) {
      throw new BadRequestException('Email already exists');
    }
    const createdUser = await this.usersService.create(dto);

    const token = this.jwtService.sign({ email: createdUser.email }, { expiresIn: '1d' });
    await this.mailService.sendVerificationEmail(createdUser.email, token);

    return {
      message: 'Please check your email to verify your account.',
    };
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      await this.usersService.verifyByEmail(payload.email);
      return { message: 'Email successfully verified' };
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
      throw new BadRequestException('Email already verified');
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
    const token = this.jwtService.sign({ email: user.email }, { expiresIn: '1d' });
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
}
