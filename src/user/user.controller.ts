import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { plainToInstance } from 'class-transformer';
import { User } from './entities/user.entity';
import { UpdateMeDto } from './dto/update-me.dto';
import { CreateUserChangeDto } from './dto/create-user-change.dto';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { VerifyUserChangeDto } from './dto/verify-user-change.dto';
import { Public } from 'src/app/decorators/public.decorator';
import messages from './user.messages';
import { UnsupportedMessageTypeError } from 'src/app/app.errors';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  clientUrl: string;

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    const clientUrl = this.configService.get<string>('clientApp.url', '');
    if (!clientUrl) {
      throw new Error('Client app URL is not configured');
    }
    this.clientUrl = clientUrl;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: AuthenticatedRequest) {
    return plainToInstance(User, req.user, { excludeExtraneousValues: true });
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Req() req: AuthenticatedRequest, @Body() body: UpdateMeDto) {
    const user = await this.userService.update(req.user, body);
    return plainToInstance(User, user, { excludeExtraneousValues: true });
  }

  @Post('secure-change')
  @Throttle({ default: { ttl: 30 * 1000, limit: 1 } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  secureUpdateMe(@Req() req: AuthenticatedRequest, @Body() body: CreateUserChangeDto) {
    return this.userService.secureUpdate(req.user, body);
  }

  @Get('secure-change/verify')
  @Public()
  @Redirect()
  async verifyEmail(@Query() query: VerifyUserChangeDto) {
    const { token, type } = query;
    await this.userService.verifySecureUpdate(token, type);
    const url = new URL(this.clientUrl);

    const message = messages.secureChange[type];

    if (!message) {
      throw new UnsupportedMessageTypeError(type);
    }

    url.searchParams.set('message', message);
    return { url };
  }
}
