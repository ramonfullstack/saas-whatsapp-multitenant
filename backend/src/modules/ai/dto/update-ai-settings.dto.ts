import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAiSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: ['openai', 'anthropic', 'local'] })
  @IsOptional()
  @IsString()
  @IsIn(['openai', 'anthropic', 'local'])
  provider?: string;

  @ApiPropertyOptional({ example: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ enum: ['professional', 'friendly', 'concise', 'custom'] })
  @IsOptional()
  @IsString()
  @IsIn(['professional', 'friendly', 'concise', 'custom'])
  tone?: string;

  @ApiPropertyOptional({ description: 'Prompt de tom customizado (quando tone = custom)' })
  @IsOptional()
  @IsString()
  customTonePrompt?: string;

  @ApiPropertyOptional({
    description: 'Regras de guardrail',
    example: ['Nunca prometer desconto', 'Não compartilhar dados internos'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guardrails?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  knowledgeBaseEnabled?: boolean;

  @ApiPropertyOptional({ default: 1024 })
  @IsOptional()
  @IsInt()
  @Min(256)
  @Max(4096)
  maxTokensPerRequest?: number;

  @ApiPropertyOptional({ default: 100000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  dailyLimitTokens?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  saveOutputs?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  redactSensitiveData?: boolean;
}
