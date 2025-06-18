export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export interface PreauthTokenPayload {
  email: string;
  ip: string;
}

export interface GoogleStrategyUserPayload {
  email: string;
  firstName: string;
  lastName: string;
}
