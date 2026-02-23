import { Injectable, Logger } from '@nestjs/common';
import {
  AiProvider,
  AiCompletionRequest,
  AiCompletionResponse,
} from './ai-provider.interface';

/**
 *  OpenAI Provider — chama a API da OpenAI via fetch nativo.
 *  Zero dependências externas (sem sdk), menor footprint.
 */
@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  // Custo por 1M tokens (USD) — atualizar conforme pricing
  private readonly pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  };

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY env var is not set');
    }

    const start = Date.now();

    const body = {
      model: req.model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0.4,
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errBody = await response.text();
      this.logger.error(`OpenAI API error ${response.status}: ${errBody}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const usage = data.usage ?? {};

    const tokensInput = usage.prompt_tokens ?? 0;
    const tokensOutput = usage.completion_tokens ?? 0;
    const pricing = this.pricing[req.model] ?? this.pricing['gpt-4o-mini'];
    const costEstimate =
      (tokensInput / 1_000_000) * pricing.input +
      (tokensOutput / 1_000_000) * pricing.output;

    return {
      content: choice?.message?.content?.trim() ?? '',
      tokensInput,
      tokensOutput,
      model: data.model ?? req.model,
      costEstimate: Math.round(costEstimate * 1_000_000) / 1_000_000, // 6 casas
      latencyMs,
    };
  }
}
