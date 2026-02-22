import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { SendMessageDto } from './dto/send-message.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MessagesGateway } from './messages.gateway';

export const MESSAGES_QUEUE = 'messages';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
    private readonly gateway: MessagesGateway,
    @InjectQueue(MESSAGES_QUEUE) private readonly queue: Queue,
  ) {}

  async findByTicket(companyId: string, ticketId: string) {
    await this.tickets.findOne(companyId, ticketId);
    return this.prisma.message.findMany({
      where: { companyId, ticketId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async send(
    companyId: string,
    ticketId: string,
    dto: SendMessageDto,
    userId: string,
  ) {
    const ticket = await this.tickets.findOne(companyId, ticketId);
    const message = await this.prisma.message.create({
      data: {
        companyId,
        ticketId,
        content: dto.content,
        fromMe: true,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        status: 'PENDING',
      },
    });

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { lastMessageAt: new Date() },
    });

    await this.queue.add(
      'send',
      {
        messageId: message.id,
        companyId,
        sessionName: ticket.whatsAppAccount.sessionName,
        phone: ticket.contact.phone,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    this.gateway.emitMessageCreated(companyId, { ...message, ticketId });
    this.gateway.emitTicketUpdated(companyId, ticketId);

    return message;
  }

  async createFromWebhook(
    companyId: string,
    ticketId: string,
    data: {
      externalId: string;
      content: string;
      fromMe: boolean;
      mediaUrl?: string;
      mediaType?: string;
    },
  ) {
    const existing = await this.prisma.message.findFirst({
      where: { companyId, externalId: data.externalId },
    });
    if (existing) return existing;

    const message = await this.prisma.message.create({
      data: {
        companyId,
        ticketId,
        externalId: data.externalId,
        content: data.content,
        fromMe: data.fromMe,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        status: 'RECEIVED',
      },
    });

    await this.tickets.updateLastMessageAt(companyId, ticketId);
    this.gateway.emitMessageCreated(companyId, { ...message, ticketId });
    this.gateway.emitTicketUpdated(companyId, ticketId);

    return message;
  }

  async markAsRead(companyId: string, messageId: string) {
    const msg = await this.prisma.message.findFirst({
      where: { id: messageId, companyId, deletedAt: null },
    });
    if (!msg) throw new NotFoundException('Message not found');
    await this.prisma.message.update({
      where: { id: messageId },
      data: { status: 'READ' },
    });
    return { success: true };
  }
}
