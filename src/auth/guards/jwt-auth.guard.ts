import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { jwtDecrypt } from 'jose';
import { Request } from 'express';
import { AuthTokenPayload } from '../auth.types';
import { BaseJwtGuard } from './base-jwt.guard';

@Injectable()
export class JwtAuthGuard extends BaseJwtGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const { payload } = await jwtDecrypt<AuthTokenPayload>(token, this.encryptionKey);
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
