import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { MoveTicketDto } from './dto/move-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CompanyId } from '../../common/decorators';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import { CompanyContextGuard } from '../../common/guards';

@UseGuards(JwtAuthGuard, CompanyContextGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  findAll(@CompanyId() companyId: string) {
    return this.tickets.findAll(companyId);
  }

  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.tickets.findOne(companyId, id);
  }

  @Patch(':id/move')
  move(@CompanyId() companyId: string, @Param('id') id: string, @Body() dto: MoveTicketDto) {
    return this.tickets.moveToStep(companyId, id, dto);
  }

  @Patch(':id/assign')
  assign(@CompanyId() companyId: string, @Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.tickets.assign(companyId, id, dto);
  }
}
