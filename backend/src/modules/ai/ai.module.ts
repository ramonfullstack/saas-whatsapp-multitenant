import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProcessor, AI_QUEUE } from './ai.processor';
import { PromptsService } from './prompts.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

@Module({
  imports: [
    PrismaModule,
    MessagesModule,
    BullModule.registerQueue({ name: AI_QUEUE }),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    PromptsService,
    AiProcessor,
    {
      provide: AI_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('AI_PROVIDER', 'openai');
        const logger = new Logger('AiProviderFactory');

        switch (provider) {
          case 'anthropic':
            logger.log('Using Anthropic (Claude) AI provider');
            return new AnthropicProvider();
          case 'openai':
          default:
            logger.log('Using OpenAI AI provider');
            return new OpenAiProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [AiService],
})
export class AiModule {}
