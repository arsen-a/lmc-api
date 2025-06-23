import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  Ip,
  HttpCode,
  Redirect,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, PreauthDto } from './auth.dto';
import { CreateUserDto } from 'src/users/users.dto';
import { ResendVerificationDto } from './auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthTokenPayload, GoogleStrategyUserPayload } from 'src/auth/auth.types';
import { User } from 'src/users/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { JwtPreauthGuard } from './guards/jwt-preauth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('preauth')
  async preauth(@Body() dto: PreauthDto, @Ip() ip: string) {
    return await this.authService.getPreauthData(dto.email, ip);
  }

  @Post('login')
  @UseGuards(JwtPreauthGuard)
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    return await this.authService.login(user);
  }

  @Post('register')
  @UseGuards(JwtPreauthGuard)
  @HttpCode(201)
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Get('verify')
  @Redirect()
  async verifyEmail(@Query('token') token: string) {
    const clientUrl = this.configService.get<string>('clientApp.url', '') + '/verify';
    if (!clientUrl) {
      throw new Error('Client app URL is not configured');
    }
    const { accessToken } = await this.authService.verifyEmail(token);
    const url = new URL(clientUrl);
    url.searchParams.set('token', accessToken);

    return { url };
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request & { user: AuthTokenPayload }) {
    const user = this.usersService.findById(req.user.sub);
    return plainToInstance(User, user, { excludeExtraneousValues: true });
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @Redirect()
  async googleAuthRedirect(@Req() req: Request & { user: GoogleStrategyUserPayload }) {
    const { accessToken } = await this.authService.authenticateWithGoogle(req.user);
    const clientUrl = this.configService.get<string>('clientApp.url', '');
    if (!clientUrl) {
      throw new Error('Client app URL is not configured');
    }
    const url = new URL(clientUrl);
    url.searchParams.set('accessToken', accessToken);
    return { url };
  }
}
