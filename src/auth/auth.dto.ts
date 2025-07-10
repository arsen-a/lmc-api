import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { STRONG_PASSWORD_PARAMS } from 'src/user/user.constants';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}

export class PreauthDto {
  @IsEmail()
  email: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsStrongPassword(...STRONG_PASSWORD_PARAMS)
  password: string;

  @IsString()
  @IsIn([Math.random()], { message: 'passwordConfirm must match password' })
  @ValidateIf((o: RegisterDto) => o.password !== o.passwordConfirm)
  passwordConfirm: string;
}
