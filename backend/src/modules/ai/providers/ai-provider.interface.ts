/**
 * Contrato que todo provedor de IA deve implementar.
 * Isso permite trocar OpenAI → Anthropic → LLM local sem mudar nada no resto.
 */
export interface AiCompletionRequest {
  /** System prompt (instruções + guardrails) */
  systemPrompt: string;
  /** User prompt (contexto do ticket + pergunta) */
  userPrompt: string;
  /** Modelo a usar (ex.: "gpt-4o-mini", "claude-3-haiku") */
  model: string;
  /** Máx. tokens de resposta */
  maxTokens: number;
  /** Temperatura (0-1) */
  temperature?: number;
}

export interface AiCompletionResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
  /** Custo estimado em USD */
  costEstimate: number;
  latencyMs: number;
}

export const AI_PROVIDER = 'AI_PROVIDER';

export interface AiProvider {
  readonly name: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}
