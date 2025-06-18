import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { jwtDecrypt, errors } from 'jose';
import { Request } from 'express';
import { PreauthTokenPayload } from '../auth.types';
import { BaseJwtGuard } from './base-jwt.guard';

@Injectable()
export class JwtPreauthGuard extends BaseJwtGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException('Missing Preauth Token');
    }

    try {
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress;

      const email = (req.body as { email?: string })?.email ?? '';

      const { payload } = await jwtDecrypt<PreauthTokenPayload>(token, this.encryptionKey);

      if (payload.ip !== clientIp || payload.email !== email) {
        throw new UnauthorizedException('Preauth Data Mismatch');
      }

      req.user = payload;
      return true;
    } catch (e) {
      if (e instanceof errors.JWTExpired) {
        throw new UnauthorizedException('Preauth Token Expired');
      }
      throw new UnauthorizedException('Invalid Preauth Token');
    }
  }
}
