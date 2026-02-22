import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  onModuleInit(): void {
    this.$connect();
    this.logger.log('Prisma connected to database');
  }

  onModuleDestroy(): void {
    this.$disconnect();
  }

  /**
   * Helper para garantir que todas as queries sejam por companyId.
   * Use em serviços: this.prisma.withCompany(companyId).ticket.findMany(...)
   */
  withCompany(companyId: string) {
    return this;
  }

  cleanDbForTests(): Promise<unknown> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDbForTests is not allowed in production');
    }
    return this.$transaction([
      this.message.deleteMany(),
      this.ticket.deleteMany(),
      this.contact.deleteMany(),
      this.whatsAppAccount.deleteMany(),
      this.funnelStep.deleteMany(),
      this.funnel.deleteMany(),
      this.user.deleteMany(),
      this.company.deleteMany(),
    ]);
  }
}
