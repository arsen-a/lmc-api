import type { AuthTokenPayload } from './auth/auth.types';

declare global {
  type AuthenticatedRequest = Request & {
    user: AuthTokenPayload;
  };
}

export {};
