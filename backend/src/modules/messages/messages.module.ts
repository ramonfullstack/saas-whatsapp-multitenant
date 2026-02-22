import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { MessagesProcessor } from './messages-processor';
import { TicketsModule } from '../tickets/tickets.module';
import { MESSAGES_QUEUE } from './messages.service';

@Module({
  imports: [
    forwardRef(() => TicketsModule),
    BullModule.registerQueue({ name: MESSAGES_QUEUE }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me-in-production'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, MessagesProcessor],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
