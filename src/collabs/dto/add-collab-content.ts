import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddContentDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description: string;
}
