import { User } from './user/entities/user.entity';

declare global {
  type AuthenticatedRequest = Request & {
    user: User;
  };
}

export {};
