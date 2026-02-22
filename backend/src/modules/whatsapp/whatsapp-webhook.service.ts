import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { TicketsService } from '../tickets/tickets.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contacts: ContactsService,
    private readonly tickets: TicketsService,
    private readonly messages: MessagesService,
  ) {}

  async handleIncomingMessage(data: {
    instanceName: string;
    externalId: string;
    phone: string;
    pushName?: string;
    content: string;
  }): Promise<void> {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: {
        sessionName: data.instanceName,
        deletedAt: null,
      },
    });
    if (!account) {
      this.logger.warn(`WhatsApp account not found for instance: ${data.instanceName}`);
      return;
    }

    const companyId = account.companyId;
    const contact = await this.contacts.findOrCreate(companyId, data.phone, {
      name: data.pushName,
    });

    const ticket = await this.tickets.getOrCreateTicket(
      companyId,
      contact.id,
      account.id,
    );

    await this.messages.createFromWebhook(companyId, ticket.id, {
      externalId: data.externalId,
      content: data.content,
      fromMe: false,
    });

    this.logger.log(
      `Incoming message company=${companyId} ticket=${ticket.id} contact=${contact.phone}`,
    );
  }

  async updateConnectionStatus(instanceName: string, state: string): Promise<void> {
    const updated = await this.prisma.whatsAppAccount.updateMany({
      where: { sessionName: instanceName, deletedAt: null },
      data: { status: state.toUpperCase() },
    });
    if (updated.count > 0) {
      this.logger.log(`Connection update: ${instanceName} -> ${state}`);
    }
  }
}
