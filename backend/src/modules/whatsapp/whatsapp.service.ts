import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WhatsappService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.whatsAppAccount.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('WhatsApp account not found');
    return account;
  }

  async create(
    companyId: string,
    sessionName: string,
    evolutionId?: string,
  ) {
    const existing = await this.prisma.whatsAppAccount.findFirst({
      where: {
        companyId,
        OR: [
          { sessionName },
          ...(evolutionId ? [{ evolutionId }] : []),
        ],
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        'An account with this session name or evolution ID already exists',
      );
    }
    return this.prisma.whatsAppAccount.create({
      data: {
        companyId,
        evolutionId: evolutionId ?? sessionName,
        sessionName,
        status: 'DISCONNECTED',
      },
    });
  }

  async updateQr(companyId: string, id: string, qrCode: string | null) {
    await this.findOne(companyId, id);
    return this.prisma.whatsAppAccount.update({
      where: { id },
      data: { qrCode },
    });
  }
}
