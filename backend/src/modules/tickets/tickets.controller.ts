import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { MoveTicketDto } from './dto/move-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CompanyId } from '../../common/decorators';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import { CompanyContextGuard } from '../../common/guards';

@ApiTags('tickets')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, CompanyContextGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tickets (ordenado por lastMessageAt)' })
  findAll(@CompanyId() companyId: string) {
    return this.tickets.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do ticket + mensagens' })
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.tickets.findOne(companyId, id);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Mover ticket para outra etapa (Kanban)' })
  move(@CompanyId() companyId: string, @Param('id') id: string, @Body() dto: MoveTicketDto) {
    return this.tickets.moveToStep(companyId, id, dto);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Atribuir ticket a um usuário' })
  assign(@CompanyId() companyId: string, @Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.tickets.assign(companyId, id, dto);
  }
}
