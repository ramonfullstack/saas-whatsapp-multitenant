import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AiService } from './ai.service';

export const AI_QUEUE = 'ai';

interface AiJobData {
  type: 'summarize' | 'classify';
  companyId: string;
  ticketId: string;
  userId: string;
  messageCount?: number;
  categories?: string[];
}

@Processor(AI_QUEUE)
export class AiProcessor {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly ai: AiService) {}

  @Process('summarize')
  async handleSummarize(job: Job<AiJobData>) {
    this.logger.log(
      `[Queue] summarize ticket=${job.data.ticketId} company=${job.data.companyId}`,
    );
    try {
      const result = await this.ai.summarize(
        job.data.companyId,
        job.data.ticketId,
        job.data.userId,
        { messageCount: job.data.messageCount },
      );
      return result;
    } catch (error: any) {
      this.logger.error(`[Queue] summarize failed: ${error.message}`);
      throw error;
    }
  }

  @Process('classify')
  async handleClassify(job: Job<AiJobData>) {
    this.logger.log(
      `[Queue] classify ticket=${job.data.ticketId} company=${job.data.companyId}`,
    );
    try {
      const result = await this.ai.classify(
        job.data.companyId,
        job.data.ticketId,
        job.data.userId,
        {
          messageCount: job.data.messageCount,
          categories: job.data.categories,
        },
      );
      return result;
    } catch (error: any) {
      this.logger.error(`[Queue] classify failed: ${error.message}`);
      throw error;
    }
  }
}
