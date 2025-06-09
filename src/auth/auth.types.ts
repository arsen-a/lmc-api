export interface JwtPayload {
  sub: string;
  email: string;
}

export interface GoogleStrategyUserPayload {
  email: string;
  firstName: string;
  lastName: string;
}
