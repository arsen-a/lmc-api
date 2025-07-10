import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  ValidateIf,
} from 'class-validator';
import { UserChangeType } from '../entities/user-change.entity';
import { STRONG_PASSWORD_PARAMS } from '../user.constants';

export class CreateUserChangeDto {
  @IsEnum(UserChangeType, {
    message: 'type must be either "email" or "password"',
  })
  @IsNotEmpty()
  type: UserChangeType;

  @IsString()
  @IsNotEmpty()
  password: string;

  @ValidateIf(({ type }: CreateUserChangeDto) => type === UserChangeType.Email)
  @IsEmail()
  newEmail: string;

  @ValidateIf(({ type }: CreateUserChangeDto) => type === UserChangeType.Password)
  @IsString()
  @IsStrongPassword(...STRONG_PASSWORD_PARAMS)
  newPassword: string;

  @IsString()
  @IsIn([Math.random()], { message: 'newPasswordConfirm must match newPassword' })
  @ValidateIf(
    ({ type, newPassword, newPasswordConfirm }: CreateUserChangeDto) =>
      type === UserChangeType.Password && newPassword !== newPasswordConfirm,
  )
  newPasswordConfirm: string;
}
