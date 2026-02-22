import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

/**
 * Evolution API envia o nome da instância no payload.
 * Ref: https://doc.evolution-api.com/v2/en/configuration/webhooks
 */
export interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export interface EvolutionMessagePayload {
  instance?: string;
  instanceName?: string;
  key?: EvolutionMessageKey;
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
    documentMessage?: { caption?: string };
    [key: string]: unknown;
  };
  messageType?: string;
}

@ApiTags('webhook')
@Controller('webhook')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(private readonly webhookService: WhatsappWebhookService) {}

  @Public()
  @Post('messages-upsert')
  async messagesUpsert(@Body() body: EvolutionMessagePayload) {
    this.logger.debug(`Webhook messages-upsert: ${JSON.stringify(body).slice(0, 200)}`);
    const instance =
      body.instance ?? body.instanceName ?? (body as { instance?: string }).instance;
    if (!instance) {
      this.logger.warn('Webhook messages-upsert: missing instance name');
      return { received: true };
    }
    const key = body.key;
    if (!key?.id || key.fromMe) {
      return { received: true };
    }
    const content = this.extractContent(body.message);
    if (!content?.trim()) {
      return { received: true };
    }
    const phone = key.remoteJid?.replace('@s.whatsapp.net', '') ?? '';
    if (!phone) {
      return { received: true };
    }

    await this.webhookService.handleIncomingMessage({
      instanceName: instance,
      externalId: key.id,
      phone,
      pushName: body.pushName,
      content,
    });
    return { received: true };
  }

  @Public()
  @Post('connection-update')
  async connectionUpdate(@Body() body: { instance?: string; state?: string }) {
    if (body.instance && body.state) {
      await this.webhookService.updateConnectionStatus(body.instance, body.state);
    }
    return { received: true };
  }

  private extractContent(message: EvolutionMessagePayload['message']): string {
    if (!message) return '';
    if (typeof message.conversation === 'string') return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.documentMessage?.caption) return message.documentMessage.caption;
    return '';
  }
}
