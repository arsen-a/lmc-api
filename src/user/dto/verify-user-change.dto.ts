import { IsEnum, IsHexadecimal } from 'class-validator';
import { UserChangeType } from '../entities/user-change.entity';

export class VerifyUserChangeDto {
  @IsHexadecimal()
  token: string;

  @IsEnum(UserChangeType)
  type: UserChangeType;
}
