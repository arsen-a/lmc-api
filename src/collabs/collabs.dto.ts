import {
  IsString,
  MinLength,
  IsOptional,
  ValidateNested,
  IsArray,
  IsNotEmpty,
  IsIn,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class CollabPromptMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';
}

export class CollabPromptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollabPromptMessageDto)
  messages: CollabPromptMessageDto[];
}
