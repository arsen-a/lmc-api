// src/collab/middleware/collab-context.middleware.ts
import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { CollabsService } from '../collabs.service';
import { Subject } from '@casl/ability';
import { User } from 'src/user/entities/user.entity';

type CollabContextRequest = Request<{ collabId?: string }, any, { collabId?: string }> & {
  user?: User;
  subject?: Subject;
  role?: string;
};

@Injectable()
export class CollabContextGuard implements CanActivate {
  constructor(private readonly collabService: CollabsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<CollabContextRequest>();
    const collabId = req.params.collabId || req.body?.collabId;

    if (!collabId) {
      return true;
    }

    const { collab, role } = await this.collabService.findUserCollabRole({
      user: req.user,
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
