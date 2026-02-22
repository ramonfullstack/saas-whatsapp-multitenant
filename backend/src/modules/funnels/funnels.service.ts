import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFunnelDto } from './dto/create-funnel.dto';
import { CreateFunnelStepDto } from './dto/create-funnel-step.dto';
import { UpdateFunnelStepDto } from './dto/update-funnel-step.dto';

@Injectable()
export class FunnelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.funnel.findMany({
      where: { companyId, deletedAt: null },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findDefault(companyId: string) {
    const funnel = await this.prisma.funnel.findFirst({
      where: { companyId, isDefault: true, deletedAt: null },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!funnel) throw new NotFoundException('Default funnel not found');
    return funnel;
  }

  async findOne(companyId: string, id: string) {
    const funnel = await this.prisma.funnel.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!funnel) throw new NotFoundException('Funnel not found');
    return funnel;
  }

  async create(companyId: string, dto: CreateFunnelDto) {
    const isFirst = (await this.prisma.funnel.count({ where: { companyId, deletedAt: null } })) === 0;
    return this.prisma.funnel.create({
      data: {
        companyId,
        name: dto.name,
        isDefault: isFirst,
      },
      include: { steps: true },
    });
  }

  async createStep(companyId: string, funnelId: string, dto: CreateFunnelStepDto) {
    await this.findOne(companyId, funnelId);
    const maxOrder = await this.prisma.funnelStep
      .aggregate({
        where: { funnelId },
        _max: { order: true },
      })
      .then((r) => (r._max.order ?? -1) + 1);
    return this.prisma.funnelStep.create({
      data: {
        funnelId,
        name: dto.name,
        order: dto.order ?? maxOrder,
        color: dto.color,
      },
    });
  }

  async updateStep(
    companyId: string,
    funnelId: string,
    stepId: string,
    dto: UpdateFunnelStepDto,
  ) {
    await this.findOne(companyId, funnelId);
    return this.prisma.funnelStep.update({
      where: { id: stepId, funnelId },
      data: dto,
    });
  }
}
