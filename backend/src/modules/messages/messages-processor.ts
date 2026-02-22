import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MESSAGES_QUEUE } from './messages.service';

interface SendMessageJob {
  messageId: string;
  companyId: string;
  sessionName: string;
  phone: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}

@Processor(MESSAGES_QUEUE)
export class MessagesProcessor {
  private readonly logger = new Logger(MessagesProcessor.name);
  private readonly evolutionBaseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.evolutionBaseUrl =
      this.config.get<string>('EVOLUTION_API_URL', 'http://evolution-api:8080');
  }

  @Process('send')
  async handleSend(job: Job<SendMessageJob>): Promise<void> {
    const { messageId, sessionName, phone, content, mediaUrl, mediaType } =
      job.data;

    const normalizedPhone = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    const url = `${this.evolutionBaseUrl}/message/sendText/${sessionName}`;

    try {
      let body: { number: string; text?: string; medias?: { mediatype: string; media: string }[] };
      if (mediaUrl && mediaType) {
        body = {
          number: normalizedPhone.replace('@s.whatsapp.net', ''),
          text: content,
          medias: [{ mediatype: mediaType, media: mediaUrl }],
        };
      } else {
        body = {
          number: normalizedPhone.replace('@s.whatsapp.net', ''),
          text: content,
        };
      }

      const apiKey = this.config.get<string>('EVOLUTION_API_KEY', '');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { apikey: apiKey }),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Evolution API error: ${res.status} ${text}`);
      }

      await this.prisma.message.update({
        where: { id: messageId },
        data: { status: 'SENT' },
      });
      this.logger.log(`Message ${messageId} sent via ${sessionName}`);
    } catch (err) {
      this.logger.error(`Failed to send message ${messageId}:`, err);
      await this.prisma.message.update({
        where: { id: messageId },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }
}
