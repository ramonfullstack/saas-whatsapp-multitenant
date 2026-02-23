import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SummarizeTicketDto {
  @ApiPropertyOptional({
    description: 'Quantidade máxima de mensagens a considerar no resumo',
    default: 50,
    minimum: 5,
    maximum: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(200)
  messageCount?: number;
}
