import { Injectable, Logger } from '@nestjs/common';

interface MessageItem {
  fromMe: boolean;
  content: string;
  createdAt: Date | string;
}

interface CompanyAiConfig {
  tone: string;
  customTonePrompt?: string | null;
  guardrails: string[];
  redactSensitiveData: boolean;
}

@Injectable()
export class PromptsService {
  private readonly logger = new Logger(PromptsService.name);

  // ─── Tone ─────────────────────────────────────────────

  private toneInstruction(config: CompanyAiConfig): string {
    const tones: Record<string, string> = {
      professional:
        'Responda de forma profissional, educada e objetiva. Use linguagem formal mas acessível.',
      friendly:
        'Responda de forma amigável e calorosa, usando linguagem informal mas respeitosa. Use emojis com moderação.',
      concise:
        'Responda de forma extremamente breve e direta. Vá direto ao ponto sem floreios.',
    };
    if (config.tone === 'custom' && config.customTonePrompt) {
      return config.customTonePrompt;
    }
    return tones[config.tone] ?? tones.professional;
  }

  // ─── Guardrails ───────────────────────────────────────

  private guardrailBlock(guardrails: string[]): string {
    if (!guardrails.length) return '';
    const rules = guardrails.map((g, i) => `  ${i + 1}. ${g}`).join('\n');
    return `\n\n## REGRAS OBRIGATÓRIAS (nunca violar)\n${rules}`;
  }

  // ─── Redact ───────────────────────────────────────────

  private redactSensitiveData(text: string): string {
    // CPF
    let redacted = text.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_REDACTED]');
    // CNPJ
    redacted = redacted.replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ_REDACTED]');
    // Credit card (basic)
    redacted = redacted.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_REDACTED]');
    // Email inline
    redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
    return redacted;
  }

  // ─── Format Messages ─────────────────────────────────

  private formatConversation(
    messages: MessageItem[],
    contactName: string,
    config: CompanyAiConfig,
  ): string {
    return messages
      .map((m) => {
        const sender = m.fromMe ? 'Atendente' : contactName;
        const content = config.redactSensitiveData
          ? this.redactSensitiveData(m.content)
          : m.content;
        return `[${sender}]: ${content}`;
      })
      .join('\n');
  }

  // ─── Suggest Reply ────────────────────────────────────

  buildSuggestReplyPrompt(params: {
    messages: MessageItem[];
    contactName: string;
    funnelStep: string;
    additionalContext?: string;
    config: CompanyAiConfig;
  }): { systemPrompt: string; userPrompt: string } {
    const { messages, contactName, funnelStep, additionalContext, config } =
      params;

    const conversation = this.formatConversation(messages, contactName, config);
    const tone = this.toneInstruction(config);
    const guardrails = this.guardrailBlock(config.guardrails);

    const systemPrompt = `Você é um assistente de atendimento via WhatsApp para uma empresa brasileira.
Seu papel é SUGERIR a próxima resposta que o atendente humano deve enviar.

## Instruções de tom
${tone}

## Contexto do atendimento
- Etapa do funil: ${funnelStep}
- Nome do contato: ${contactName}
${additionalContext ? `- Contexto adicional: ${additionalContext}` : ''}
${guardrails}

## Formato de saída
Retorne SOMENTE o texto da mensagem sugerida, sem prefixos, aspas ou explicações.
Escreva em português brasileiro (pt-BR).`;

    const userPrompt = `Conversa até agora:\n\n${conversation}\n\nSugira a próxima resposta do atendente:`;

    return { systemPrompt, userPrompt };
  }

  // ─── Summarize ────────────────────────────────────────

  buildSummarizePrompt(params: {
    messages: MessageItem[];
    contactName: string;
    funnelStep: string;
    config: CompanyAiConfig;
  }): { systemPrompt: string; userPrompt: string } {
    const { messages, contactName, funnelStep, config } = params;
    const conversation = this.formatConversation(messages, contactName, config);

    const systemPrompt = `Você é um assistente que gera resumos concisos de conversas de atendimento via WhatsApp.

## Instruções
- Resuma os pontos principais da conversa
- Destaque: assunto principal, pedidos do cliente, decisões tomadas, pendências
- Máximo de 5 bullet points
- Escreva em português brasileiro (pt-BR)

## Contexto
- Etapa do funil: ${funnelStep}
- Nome do contato: ${contactName}
- Total de mensagens: ${messages.length}`;

    const userPrompt = `Conversa:\n\n${conversation}\n\nGere o resumo:`;

    return { systemPrompt, userPrompt };
  }

  // ─── Classify ─────────────────────────────────────────

  buildClassifyPrompt(params: {
    messages: MessageItem[];
    contactName: string;
    funnelStep: string;
    categories?: string[];
    config: CompanyAiConfig;
  }): { systemPrompt: string; userPrompt: string } {
    const { messages, contactName, funnelStep, categories, config } = params;
    const conversation = this.formatConversation(messages, contactName, config);

    const defaultCategories = [
      'Suporte Técnico',
      'Vendas',
      'Financeiro',
      'Reclamação',
      'Dúvida Geral',
      'Agendamento',
      'Pós-Venda',
    ];

    const cats = categories?.length ? categories : defaultCategories;
    const catList = cats.map((c) => `- ${c}`).join('\n');

    const systemPrompt = `Você é um assistente que classifica conversas de atendimento via WhatsApp.

## Instruções
- Analise a conversa e classifique em uma das categorias abaixo
- Determine o nível de urgência: BAIXA | MEDIA | ALTA | CRITICA
- Determine o sentimento do cliente: POSITIVO | NEUTRO | NEGATIVO

## Categorias disponíveis
${catList}

## Contexto
- Etapa do funil: ${funnelStep}
- Nome do contato: ${contactName}

## Formato de saída (JSON estrito)
{
  "category": "string",
  "urgency": "BAIXA | MEDIA | ALTA | CRITICA",
  "sentiment": "POSITIVO | NEUTRO | NEGATIVO",
  "confidence": 0.0-1.0,
  "reasoning": "breve justificativa"
}

Retorne SOMENTE o JSON, sem markdown, sem explicações.`;

    const userPrompt = `Conversa:\n\n${conversation}\n\nClassifique:`;

    return { systemPrompt, userPrompt };
  }
}
