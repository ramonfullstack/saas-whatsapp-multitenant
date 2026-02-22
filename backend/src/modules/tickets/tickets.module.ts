import { Module, forwardRef } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { FunnelsModule } from '../funnels/funnels.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [FunnelsModule, forwardRef(() => MessagesModule)],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
