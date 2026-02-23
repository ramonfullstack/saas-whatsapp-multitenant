import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiService } from './ai.service';
import { AI_QUEUE } from './ai.processor';
import {
  SuggestReplyDto,
  SummarizeTicketDto,
  ClassifyTicketDto,
  UpdateAiSettingsDto,
} from './dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    @InjectQueue(AI_QUEUE) private readonly aiQueue: Queue,
  ) {}

  // ─── Settings ─────────────────────────────────────────

  @Get('settings')
  getSettings(@CompanyId() companyId: string) {
    return this.ai.getSettings(companyId);
  }

  @Put('settings')
  @Roles('OWNER', 'ADMIN')
  updateSettings(
    @CompanyId() companyId: string,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    return this.ai.updateSettings(companyId, dto as any);
  }

  // ─── Suggest Reply (sync — rápido, retorna na hora) ──

  @Post('tickets/:ticketId/suggest-reply')
  @HttpCode(HttpStatus.OK)
  suggestReply(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('ticketId') ticketId: string,
    @Body() dto: SuggestReplyDto,
  ) {
    return this.ai.suggestReply(companyId, ticketId, user.sub, {
      additionalContext: dto.additionalContext,
      messageCount: dto.messageCount,
    });
  }

  // ─── Summarize (sync) ─────────────────────────────────

  @Post('tickets/:ticketId/summarize')
  @HttpCode(HttpStatus.OK)
  summarize(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('ticketId') ticketId: string,
    @Body() dto: SummarizeTicketDto,
  ) {
    return this.ai.summarize(companyId, ticketId, user.sub, {
      messageCount: dto.messageCount,
    });
  }

  // ─── Summarize (async via queue) ──────────────────────

  @Post('tickets/:ticketId/summarize/async')
  @HttpCode(HttpStatus.ACCEPTED)
  async summarizeAsync(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('ticketId') ticketId: string,
    @Body() dto: SummarizeTicketDto,
  ) {
    const job = await this.aiQueue.add(
      'summarize',
      {
        type: 'summarize',
        companyId,
        ticketId,
        userId: user.sub,
        messageCount: dto.messageCount,
      },
      { attempts: 2, backoff: { type: 'exponential', delay: 3000 } },
    );
    return { jobId: job.id, status: 'queued' };
  }

  // ─── Classify (sync) ─────────────────────────────────

  @Post('tickets/:ticketId/classify')
  @HttpCode(HttpStatus.OK)
  classify(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('ticketId') ticketId: string,
    @Body() dto: ClassifyTicketDto,
  ) {
    return this.ai.classify(companyId, ticketId, user.sub, {
      messageCount: dto.messageCount,
      categories: dto.categories,
    });
  }

  // ─── Classify (async via queue) ───────────────────────

  @Post('tickets/:ticketId/classify/async')
  @HttpCode(HttpStatus.ACCEPTED)
  async classifyAsync(
    @CompanyId() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('ticketId') ticketId: string,
    @Body() dto: ClassifyTicketDto,
  ) {
    const job = await this.aiQueue.add(
      'classify',
      {
        type: 'classify',
        companyId,
        ticketId,
        userId: user.sub,
        messageCount: dto.messageCount,
        categories: dto.categories,
      },
      { attempts: 2, backoff: { type: 'exponential', delay: 3000 } },
    );
    return { jobId: job.id, status: 'queued' };
  }

  // ─── History / Audit ──────────────────────────────────

  @Get('runs')
  getRunHistory(
    @CompanyId() companyId: string,
    @Query('ticketId') ticketId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.ai.getRunHistory(companyId, ticketId, limit);
  }

  // ─── Usage Stats ──────────────────────────────────────

  @Get('usage')
  @Roles('OWNER', 'ADMIN')
  getUsageStats(@CompanyId() companyId: string) {
    return this.ai.getUsageStats(companyId);
  }

  // ─── Ticket Summary (last cached) ────────────────────

  @Get('tickets/:ticketId/summary')
  async getTicketSummary(
    @CompanyId() companyId: string,
    @Param('ticketId') ticketId: string,
  ) {
    const summary = await this.ai.getSettings(companyId); // just to validate company
    const existing = await (this.ai as any).prisma.ticketSummary.findUnique({
      where: { companyId_ticketId: { companyId, ticketId } },
    });
    return existing ?? { summary: null };
  }
}
