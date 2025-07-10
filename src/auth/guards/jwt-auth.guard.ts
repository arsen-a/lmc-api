import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { jwtDecrypt } from 'jose';
import { Request } from 'express';
import { AuthTokenPayload } from '../auth.types';
import { BaseJwtGuard } from './base-jwt.guard';
import { IS_PUBLIC_KEY } from 'src/app/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends BaseJwtGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const { payload } = await jwtDecrypt<AuthTokenPayload>(token, this.encryptionKey);
      const user = await this.userService.findById(payload.sub);

      if (!user?.isVerified) {
        throw new UnauthorizedException('User is not verified');
      }

      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
