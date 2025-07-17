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
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, PreauthDto } from './auth.dto';
import { RegisterDto } from 'src/auth/auth.dto';
import { ResendVerificationDto } from './auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { GoogleStrategyUserPayload } from 'src/auth/auth.types';
import { JwtPreauthGuard } from './guards/jwt-preauth.guard';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  clientUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const clientUrl = this.configService.get<string>('clientApp.url', '');
    if (!clientUrl) {
      throw new Error('Client app URL is not configured');
    }
    this.clientUrl = clientUrl;
  }

  @Post('preauth')
  async preauth(@Body() dto: PreauthDto, @Ip() ip: string) {
    return await this.authService.getPreauthData(dto.email, ip);
  }

  @Post('login')
  @UseGuards(JwtPreauthGuard)
  @HttpCode(204)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken } = await this.authService.login(body.email, body.password);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
  }

  @Post('register')
  @UseGuards(JwtPreauthGuard)
  @HttpCode(201)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('verify')
  @Redirect()
  async verifyEmail(@Query('token') token: string, @Res({ passthrough: true }) res: Response) {
    const { accessToken } = await this.authService.verifyEmail(token);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { url: new URL(this.clientUrl) };
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @Redirect()
  async googleAuthRedirect(
    @Req() req: Request & { user: GoogleStrategyUserPayload },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.authenticateWithGoogle(req.user);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { url: new URL(this.clientUrl) };
  }
}
