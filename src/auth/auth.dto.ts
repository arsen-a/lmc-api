import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MinLength,
  ValidateIf,
} from 'class-validator';

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

const strongPasswordParams: Parameters<typeof IsStrongPassword> = [
  {
    minLength: 6,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  },
  {
    message:
      'password Password must be made up of at least 6 characters, including at least one uppercase letter, one lowercase letter, one number, and one symbol.',
  },
];
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
  @IsStrongPassword(...strongPasswordParams)
  password: string;

  @IsString()
  @IsIn([Math.random()], { message: 'passwordConfirm must match Password' })
  @ValidateIf((o: RegisterDto) => o.password !== o.passwordConfirm)
  passwordConfirm: string;
}

export class UpdateMeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName?: string;
}

export enum SecureUpdateMeType {
  Email = 'email',
  Password = 'password',
}

export class SecureUpdateMeDto {
  @IsEnum(SecureUpdateMeType, {
    message: 'type Type must be either "email" or "password"',
  })
  @IsNotEmpty()
  type: SecureUpdateMeType;

  @ValidateIf(({ type }: SecureUpdateMeDto) => type === SecureUpdateMeType.Email)
  @IsEmail()
  email: string;

  @ValidateIf(({ type }: SecureUpdateMeDto) => type === SecureUpdateMeType.Password)
  @IsString()
  @IsStrongPassword(...strongPasswordParams)
  password: string;
}
