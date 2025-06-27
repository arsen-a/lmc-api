import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class TabCacheDto {
  @IsUUID()
  id: string;

  @IsString()
  @MinLength(5)
  link: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
