import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FunnelsService } from './funnels.service';
import { CreateFunnelDto } from './dto/create-funnel.dto';
import { CreateFunnelStepDto } from './dto/create-funnel-step.dto';
import { UpdateFunnelStepDto } from './dto/update-funnel-step.dto';
import { CompanyId } from '../../common/decorators';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import { CompanyContextGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';

@ApiTags('funnels')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, CompanyContextGuard, RolesGuard)
@Controller('funnels')
export class FunnelsController {
  constructor(private readonly funnels: FunnelsService) {}

  @Get()
  findAll(@CompanyId() companyId: string) {
    return this.funnels.findAll(companyId);
  }

  @Get('default')
  findDefault(@CompanyId() companyId: string) {
    return this.funnels.findDefault(companyId);
  }

  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.funnels.findOne(companyId, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(@CompanyId() companyId: string, @Body() dto: CreateFunnelDto) {
    return this.funnels.create(companyId, dto);
  }

  @Post(':funnelId/steps')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  createStep(
    @CompanyId() companyId: string,
    @Param('funnelId') funnelId: string,
    @Body() dto: CreateFunnelStepDto,
  ) {
    return this.funnels.createStep(companyId, funnelId, dto);
  }

  @Patch(':funnelId/steps/:stepId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateStep(
    @CompanyId() companyId: string,
    @Param('funnelId') funnelId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateFunnelStepDto,
  ) {
    return this.funnels.updateStep(companyId, funnelId, stepId, dto);
  }
}
