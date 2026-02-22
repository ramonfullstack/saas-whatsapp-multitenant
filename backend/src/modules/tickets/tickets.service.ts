import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FunnelsService } from '../funnels/funnels.service';
import { MessagesGateway } from '../messages/messages.gateway';
import { MoveTicketDto } from './dto/move-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly funnels: FunnelsService,
    private readonly gateway: MessagesGateway,
  ) {}

  async findAll(companyId: string) {
    return this.prisma.ticket.findMany({
      where: { companyId, deletedAt: null },
      include: {
        contact: true,
        funnelStep: true,
        assignedTo: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        contact: true,
        funnelStep: true,
        whatsAppAccount: true,
        assignedTo: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async findByContactAndAccount(
    companyId: string,
    contactId: string,
    whatsAppAccountId: string,
  ) {
    return this.prisma.ticket.findFirst({
      where: {
        companyId,
        contactId,
        whatsAppAccountId,
        deletedAt: null,
      },
      include: {
        contact: true,
        funnelStep: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async moveToStep(companyId: string, id: string, dto: MoveTicketDto) {
    const ticket = await this.findOne(companyId, id);
    const step = await this.prisma.funnelStep.findFirst({
      where: {
        id: dto.funnelStepId,
        funnel: { companyId },
        deletedAt: null,
      },
    });
    if (!step) throw new BadRequestException('Invalid funnel step');
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { funnelStepId: dto.funnelStepId },
      include: {
        contact: true,
        funnelStep: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    this.gateway.emitTicketMoved(companyId, {
      ticketId: id,
      funnelStepId: dto.funnelStepId,
    });
    this.gateway.emitTicketUpdated(companyId, id, updated);
    return updated;
  }

  async assign(companyId: string, id: string, dto: AssignTicketDto) {
    await this.findOne(companyId, id);
    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, companyId, deletedAt: null },
      });
      if (!user) throw new BadRequestException('User not found');
    }
    return this.prisma.ticket.update({
      where: { id },
      data: { assignedToId: dto.userId ?? null },
      include: {
        contact: true,
        funnelStep: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateLastMessageAt(companyId: string, ticketId: string): Promise<void> {
    await this.prisma.ticket.updateMany({
      where: { id: ticketId, companyId },
      data: { lastMessageAt: new Date() },
    });
  }

  /**
   * Cria ticket no primeiro step do funnel padrão se não existir.
   */
  async getOrCreateTicket(
    companyId: string,
    contactId: string,
    whatsAppAccountId: string,
  ) {
    let ticket = await this.findByContactAndAccount(
      companyId,
      contactId,
      whatsAppAccountId,
    );
    if (ticket) return ticket;

    const defaultFunnel = await this.funnels.findDefault(companyId);
    const firstStep = defaultFunnel.steps[0];
    if (!firstStep) throw new BadRequestException('Default funnel has no steps');

    ticket = await this.prisma.ticket.create({
      data: {
        companyId,
        contactId,
        whatsAppAccountId,
        funnelStepId: firstStep.id,
      },
      include: {
        contact: true,
        funnelStep: true,
        whatsAppAccount: true,
      },
    });
    return ticket;
  }
}
