import { IsStrongPassword } from 'class-validator';

export const STRONG_PASSWORD_PARAMS: Parameters<typeof IsStrongPassword> = [
  {
    minLength: 6,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  },
  {
    message:
      'password must be made up of at least 6 characters, including at least one uppercase letter, one lowercase letter, one number, and one symbol.',
  },
];

export const SECURE_UPDATE_TTL = 60 * 60 * 1000; // 1 hour
