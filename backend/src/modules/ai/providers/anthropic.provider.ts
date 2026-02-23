import { Injectable, Logger } from '@nestjs/common';
import {
  AiProvider,
  AiCompletionRequest,
  AiCompletionResponse,
} from './ai-provider.interface';

/**
 *  Anthropic Provider — chama Claude via fetch nativo.
 */
@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';

  private readonly pricing: Record<string, { input: number; output: number }> = {
    'claude-3-5-haiku-latest': { input: 1, output: 5 },
    'claude-3-5-sonnet-latest': { input: 3, output: 15 },
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
  };

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY env var is not set');
    }

    const start = Date.now();

    const body = {
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userPrompt }],
      temperature: req.temperature ?? 0.4,
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errBody = await response.text();
      this.logger.error(`Anthropic API error ${response.status}: ${errBody}`);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text?.trim() ?? '';
    const usage = data.usage ?? {};

    const tokensInput = usage.input_tokens ?? 0;
    const tokensOutput = usage.output_tokens ?? 0;
    const pricing =
      this.pricing[req.model] ?? this.pricing['claude-3-5-haiku-latest'];
    const costEstimate =
      (tokensInput / 1_000_000) * pricing.input +
      (tokensOutput / 1_000_000) * pricing.output;

    return {
      content,
      tokensInput,
      tokensOutput,
      model: data.model ?? req.model,
      costEstimate: Math.round(costEstimate * 1_000_000) / 1_000_000,
      latencyMs,
    };
  }
}
