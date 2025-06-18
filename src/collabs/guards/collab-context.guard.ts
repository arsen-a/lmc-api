// src/collab/middleware/collab-context.middleware.ts
import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { CollabsService } from '../collabs.service';
import { Subject } from '@casl/ability';
import { AuthTokenPayload } from 'src/auth/auth.types';

type CollabContextRequest = Request<{ collabId?: string }, any, { collabId?: string }> & {
  user?: AuthTokenPayload;
  subject?: Subject;
  role?: string;
};

@Injectable()
export class CollabContextGuard implements CanActivate {
  constructor(private readonly collabService: CollabsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<CollabContextRequest>();
    const collabId = req.params.collabId || req.body?.collabId;
    const userId = req.user?.sub;
    if (!collabId || !userId) {
      return true;
    }

    const { collab, role } = await this.collabService.findUserCollabRole({
      userId,
      collabId,
    });

    if (!collab || !role) {
      throw new NotFoundException();
    }

    req.subject = collab;
    req.role = role;

    return true;
  }
}
