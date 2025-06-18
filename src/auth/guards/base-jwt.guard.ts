import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export abstract class BaseJwtGuard implements CanActivate {
  protected readonly encryptionKey: Buffer;

  constructor(configService: ConfigService) {
    const appSecret = configService.get<string>('app.secret', '');
    this.encryptionKey = Buffer.from(appSecret, 'base64');
  }

  abstract canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>;

  protected extractToken(req: Request): string | null {
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) {
      return null;
    }
    const parts = auth.split(' ');
    return parts.length === 2 ? parts[1] : null;
  }
}
