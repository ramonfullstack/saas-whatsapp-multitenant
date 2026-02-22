import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CompanyId } from '../../common/decorators';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import { CompanyContextGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, CompanyContextGuard, RolesGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get('accounts')
  listAccounts(@CompanyId() companyId: string) {
    return this.whatsapp.findAll(companyId);
  }

  @Post('accounts')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  createAccount(
    @CompanyId() companyId: string,
    @Body() body: { sessionName: string; evolutionId?: string },
  ) {
    return this.whatsapp.create(companyId, body.sessionName, body.evolutionId);
  }

  @Get('accounts/:id')
  getAccount(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.whatsapp.findOne(companyId, id);
  }
}
