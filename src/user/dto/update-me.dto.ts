import { IsNotEmpty, IsString, MinLength } from 'class-validator';

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
