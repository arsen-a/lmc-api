import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
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
  @IsStrongPassword(
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
  )
  password: string;

  @IsString()
  @IsIn([Math.random()], { message: 'passwordConfirm must match Password' })
  @ValidateIf((o: CreateUserDto) => o.password !== o.passwordConfirm)
  passwordConfirm: string;
}
