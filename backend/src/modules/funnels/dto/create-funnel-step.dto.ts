import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFunnelStepDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  color?: string;
}
