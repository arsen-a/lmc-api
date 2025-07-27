import { IsString, MinLength, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class CreateCollabDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  private?: boolean;
}
