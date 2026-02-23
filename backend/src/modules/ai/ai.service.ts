import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptsService } from './prompts.service';
import { AiProvider, AI_PROVIDER } from './providers/ai-provider.interface';
import { MessagesGateway } from '../messages/messages.gateway';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export interface AiSettings {
  id: string;
  companyId: string;
  enabled: boolean;
  provider: string;
  model: string;
  tone: string;
  customTonePrompt: string | null;
  guardrails: string[];
  knowledgeBaseEnabled: boolean;
  maxTokensPerRequest: number;
  dailyLimitTokens: number;
  dailyTokensUsed: number;
  dailyResetAt: Date;
  saveOutputs: boolean;
  redactSensitiveData: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prompts: PromptsService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly gateway: MessagesGateway,
  ) {}

  // ─── Settings ─────────────────────────────────────────

  async getSettings(companyId: string): Promise<AiSettings> {
    let settings = await this.prisma.companyAiSettings.findUnique({
      where: { companyId },
    });
    if (!settings) {
      settings = await this.prisma.companyAiSettings.create({
        data: { companyId },
      });
    }
    return settings;
  }

  async updateSettings(companyId: string, data: Partial<AiSettings>) {
    await this.getSettings(companyId); // ensure exists
    const { id, companyId: _, ...rest } = data as any;
    return this.prisma.companyAiSettings.update({
      where: { companyId },
      data: rest,
    });
  }

  // ─── Rate Limit ───────────────────────────────────────

  private async checkAndUpdateTokens(
    settings: AiSettings,
    tokensUsed: number,
  ): Promise<void> {
    const now = new Date();
    let { dailyTokensUsed, dailyResetAt } = settings;

    // Reset diário
    if (now.getTime() - new Date(dailyResetAt).getTime() > 24 * 60 * 60 * 1000) {
      dailyTokensUsed = 0;
      dailyResetAt = now;
    }

    if (dailyTokensUsed + tokensUsed > settings.dailyLimitTokens) {
      throw new ForbiddenException(
        `Limite diário de tokens atingido (${settings.dailyLimitTokens}). Reset em ${new Date(dailyResetAt.getTime() + 24 * 60 * 60 * 1000).toISOString()}.`,
      );
    }

    await this.prisma.companyAiSettings.update({
      where: { companyId: settings.companyId },
      data: {
        dailyTokensUsed: dailyTokensUsed + tokensUsed,
        dailyResetAt,
      },
    });
  }

  // ─── Cache ────────────────────────────────────────────

  private computeHash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private async findCachedRun(
    companyId: string,
    type: 'REPLY_SUGGESTION' | 'SUMMARY' | 'CLASSIFY' | 'URGENCY',
    inputHash: string,
  ) {
    const cached = await this.prisma.aiRun.findFirst({
      where: {
        companyId,
        type,
        inputHash,
        status: 'SUCCESS',
        createdAt: { gte: new Date(Date.now() - CACHE_TTL_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });
    return cached;
  }

  // ─── Shared helpers ──────────────────────────────────

  private async loadTicketContext(companyId: string, ticketId: string, messageCount: number) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, companyId, deletedAt: null },
      include: {
        contact: true,
        funnelStep: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const messages = await this.prisma.message.findMany({
      where: { ticketId, companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: messageCount,
    });
    messages.reverse(); // chronological

    return { ticket, messages };
  }

  // ─── Suggest Reply ────────────────────────────────────

  async suggestReply(
    companyId: string,
    ticketId: string,
    userId: string,
    opts: { additionalContext?: string; messageCount?: number },
  ) {
    const settings = await this.getSettings(companyId);
    if (!settings.enabled) {
      throw new ForbiddenException('IA desabilitada para esta empresa');
    }

    const { ticket, messages } = await this.loadTicketContext(
      companyId,
      ticketId,
      opts.messageCount ?? 20,
    );

    const { systemPrompt, userPrompt } = this.prompts.buildSuggestReplyPrompt({
      messages,
      contactName: ticket.contact.name ?? ticket.contact.phone,
      funnelStep: ticket.funnelStep.name,
      additionalContext: opts.additionalContext,
      config: settings,
    });

    const inputHash = this.computeHash(`suggest:${ticketId}:${userPrompt}`);

    // Check cache
    const cached = await this.findCachedRun(companyId, 'REPLY_SUGGESTION', inputHash);
    if (cached?.output) {
      this.logger.debug(`Cache hit for suggest-reply on ticket ${ticketId}`);
      return {
        suggestion: cached.output,
        cached: true,
        aiRunId: cached.id,
      };
    }

    // Create AiRun record
    const aiRun = await this.prisma.aiRun.create({
      data: {
        companyId,
        ticketId,
        userId,
        type: 'REPLY_SUGGESTION',
        status: 'PROCESSING',
        inputHash,
        input: settings.saveOutputs ? userPrompt : null,
        provider: settings.provider,
        model: settings.model,
      },
    });

    try {
      const response = await this.provider.complete({
        systemPrompt,
        userPrompt,
        model: settings.model,
        maxTokens: settings.maxTokensPerRequest,
        temperature: 0.7,
      });

      await this.checkAndUpdateTokens(
        settings,
        (response.tokensInput ?? 0) + (response.tokensOutput ?? 0),
      );

      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: 'SUCCESS',
          output: settings.saveOutputs ? response.content : null,
          tokensInput: response.tokensInput,
          tokensOutput: response.tokensOutput,
          costEstimate: response.costEstimate,
          latencyMs: response.latencyMs,
        },
      });

      // Real-time notification
      this.gateway.emitToCompany(companyId, 'ai.suggestion', {
        ticketId,
        suggestion: response.content,
        aiRunId: aiRun.id,
      });

      return {
        suggestion: response.content,
        cached: false,
        aiRunId: aiRun.id,
        tokensUsed: (response.tokensInput ?? 0) + (response.tokensOutput ?? 0),
        costEstimate: response.costEstimate,
        latencyMs: response.latencyMs,
      };
    } catch (error: any) {
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: 'ERROR',
          errorMessage: error.message?.slice(0, 500),
        },
      });
      this.logger.error(`suggestReply failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao gerar sugestão: ${error.message}`);
    }
  }

  // ─── Summarize ────────────────────────────────────────

  async summarize(
    companyId: string,
    ticketId: string,
    userId: string,
    opts: { messageCount?: number },
  ) {
    const settings = await this.getSettings(companyId);
    if (!settings.enabled) {
      throw new ForbiddenException('IA desabilitada para esta empresa');
    }

    const { ticket, messages } = await this.loadTicketContext(
      companyId,
      ticketId,
      opts.messageCount ?? 50,
    );

    const { systemPrompt, userPrompt } = this.prompts.buildSummarizePrompt({
      messages,
      contactName: ticket.contact.name ?? ticket.contact.phone,
      funnelStep: ticket.funnelStep.name,
      config: settings,
    });

    const inputHash = this.computeHash(`summarize:${ticketId}:${userPrompt}`);

    const cached = await this.findCachedRun(companyId, 'SUMMARY', inputHash);
    if (cached?.output) {
      return { summary: cached.output, cached: true, aiRunId: cached.id };
    }

    const aiRun = await this.prisma.aiRun.create({
      data: {
        companyId,
        ticketId,
        userId,
        type: 'SUMMARY',
        status: 'PROCESSING',
        inputHash,
        input: settings.saveOutputs ? userPrompt : null,
        provider: settings.provider,
        model: settings.model,
      },
    });

    try {
      const response = await this.provider.complete({
        systemPrompt,
        userPrompt,
        model: settings.model,
        maxTokens: settings.maxTokensPerRequest,
        temperature: 0.3,
      });

      await this.checkAndUpdateTokens(
        settings,
        (response.tokensInput ?? 0) + (response.tokensOutput ?? 0),
      );

      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: 'SUCCESS',
          output: settings.saveOutputs ? response.content : null,
          tokensInput: response.tokensInput,
          tokensOutput: response.tokensOutput,
          costEstimate: response.costEstimate,
          latencyMs: response.latencyMs,
        },
      });

      // Upsert ticket summary
      await this.prisma.ticketSummary.upsert({
        where: {
          companyId_ticketId: { companyId, ticketId },
        },
        create: {
          companyId,
          ticketId,
          summary: response.content,
          messageCount: messages.length,
          aiRunId: aiRun.id,
        },
        update: {
          summary: response.content,
          messageCount: messages.length,
          aiRunId: aiRun.id,
        },
      });

      this.gateway.emitToCompany(companyId, 'ai.summary', {
        ticketId,
        summary: response.content,
        aiRunId: aiRun.id,
      });

      return {
        summary: response.content,
        cached: false,
        aiRunId: aiRun.id,
        tokensUsed: (response.tokensInput ?? 0) + (response.tokensOutput ?? 0),
        costEstimate: response.costEstimate,
        latencyMs: response.latencyMs,
      };
    } catch (error: any) {
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: 'ERROR',
          errorMessage: error.message?.slice(0, 500),
        },
      });
      this.logger.error(`summarize failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao gerar resumo: ${error.message}`);
    }
  }

  // ─── Classify ─────────────────────────────────────────

  async classify(
    companyId: string,
    ticketId: string,
    userId: string,
    opts: { messageCount?: number; categories?: string[] },
  ) {
    const settings = await this.getSettings(companyId);
    if (!settings.enabled) {
      throw new ForbiddenException('IA desabilitada para esta empresa');
    }

    const { ticket, messages } = await this.loadTicketContext(
      companyId,
      ticketId,
      opts.messageCount ?? 30,
    );

    const { systemPrompt, userPrompt } = this.prompts.buildClassifyPrompt({
      messages,
      contactName: ticket.contact.name ?? ticket.contact.phone,
      funnelStep: ticket.funnelStep.name,
      categories: opts.categories,
      config: settings,
    });

    const inputHash = this.computeHash(`classify:${ticketId}:${userPrompt}`);

    const cached = await this.findCachedRun(companyId, 'CLASSIFY', inputHash);
    if (cached?.output) {
      try {
        return { classification: JSON.parse(cached.output), cached: true, aiRunId: cached.id };
      } catch {
        // stale cache, continue
      }
    }

    const aiRun = await this.prisma.aiRun.create({
      data: {
        companyId,
        ticketId,
        userId,
        type: 'CLASSIFY',
        status: 'PROCESSING',
        inputHash,
        input: settings.saveOutputs ? userPrompt : null,
        provider: settings.provider,
        model: settings.model,
      },
    });

    try {
      const response = await this.provider.complete({
        systemPrompt,
        userPrompt,
        model: settings.model,
        maxTokens: 512,
        temperature: 0.2,
      });

      await this.checkAndUpdateTokens(
        settings,
        (response.tokensInput ?? 0) + (response.tokensOutput ?? 0),
      );

      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch {
        parsed = { raw: response.content };
      }

      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: 'SUCCESS',
          output: settings.saveOutputs ? response.content : null,
          tokensInput: response.tokensInput,
          tokensOutput: response.tokensOutput,
          costEstimate: response.costEstimate,
          latencyMs: response.latencyMs,
        },
      });

      this.gateway.emitToCompany(companyId, 'ai.classification', {
        ticketId,
        classification: parsed,
        aiRunId: aiRun.id,
      });

      return {
        classification: parsed,
        cached: false,
        aiRunId: aiRun.id,
        tokensUsed: (response.tokensInput ?? 0) + (response.tokensOutput ?? 0),
        costEstimate: response.costEstimate,
        latencyMs: response.latencyMs,
      };
    } catch (error: any) {
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: 'ERROR',
          errorMessage: error.message?.slice(0, 500),
        },
      });
      this.logger.error(`classify failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao classificar: ${error.message}`);
    }
  }

  // ─── Audit / History ──────────────────────────────────

  async getRunHistory(
    companyId: string,
    ticketId?: string,
    limit = 20,
  ) {
    return this.prisma.aiRun.findMany({
      where: {
        companyId,
        ...(ticketId ? { ticketId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        ticketId: true,
        type: true,
        status: true,
        tokensInput: true,
        tokensOutput: true,
        costEstimate: true,
        provider: true,
        model: true,
        latencyMs: true,
        createdAt: true,
      },
    });
  }

  async getUsageStats(companyId: string) {
    const settings = await this.getSettings(companyId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalRuns, todayRuns, totalCost] = await Promise.all([
      this.prisma.aiRun.count({ where: { companyId } }),
      this.prisma.aiRun.count({
        where: { companyId, createdAt: { gte: today } },
      }),
      this.prisma.aiRun.aggregate({
        where: { companyId, status: 'SUCCESS' },
        _sum: { costEstimate: true, tokensInput: true, tokensOutput: true },
      }),
    ]);

    return {
      totalRuns,
      todayRuns,
      totalCostUsd: totalCost._sum.costEstimate ?? 0,
      totalTokensInput: totalCost._sum.tokensInput ?? 0,
      totalTokensOutput: totalCost._sum.tokensOutput ?? 0,
      dailyTokensUsed: settings.dailyTokensUsed,
      dailyLimitTokens: settings.dailyLimitTokens,
      dailyResetAt: settings.dailyResetAt,
    };
  }
}
