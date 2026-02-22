import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CompanyId, CurrentUser } from '../../common/decorators';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards';
import { CompanyContextGuard } from '../../common/guards';

@UseGuards(JwtAuthGuard, CompanyContextGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('ticket/:ticketId')
  findByTicket(@CompanyId() companyId: string, @Param('ticketId') ticketId: string) {
    return this.messages.findByTicket(companyId, ticketId);
  }

  @Post('ticket/:ticketId/send')
  send(
    @CompanyId() companyId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messages.send(companyId, ticketId, dto, user.sub);
  }

  @Post(':id/read')
  markAsRead(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.messages.markAsRead(companyId, id);
  }
}
