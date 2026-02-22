import { IsNotEmpty, IsString } from 'class-validator';

export class MoveTicketDto {
  @IsString()
  @IsNotEmpty()
  funnelStepId: string;
}
