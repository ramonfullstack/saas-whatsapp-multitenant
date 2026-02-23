import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SuggestReplyDto {
  @ApiPropertyOptional({ description: 'Contexto adicional para a IA' })
  @IsOptional()
  @IsString()
  additionalContext?: string;

  @ApiPropertyOptional({ description: 'Quantidade de mensagens recentes a usar', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(50)
  messageCount?: number;
}
