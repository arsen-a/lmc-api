import {
  IsString,
  MinLength,
  IsOptional,
  ValidateNested,
  IsArray,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCollabDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
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
