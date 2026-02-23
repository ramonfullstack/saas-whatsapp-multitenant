import { IsOptional, IsInt, IsArray, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ClassifyTicketDto {
  @ApiPropertyOptional({
    description: 'Quantidade de mensagens a considerar para classificar',
    default: 30,
    minimum: 5,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  messageCount?: number;

  @ApiPropertyOptional({
    description: 'Categorias customizadas para a classificação. Se não informado, usa padrão.',
    example: ['Suporte', 'Vendas', 'Financeiro', 'Reclamação', 'Dúvida'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}
