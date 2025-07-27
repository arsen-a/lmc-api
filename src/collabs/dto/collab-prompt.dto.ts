import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

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
