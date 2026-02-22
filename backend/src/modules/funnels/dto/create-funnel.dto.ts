import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFunnelDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
