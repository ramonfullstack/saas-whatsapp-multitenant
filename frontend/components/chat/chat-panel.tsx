'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiGet, apiPost } from '@/services/api';
import { useChatStore } from '@/stores/chat-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, FileText, Tag, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, Ticket } from '@/stores/chat-store';

export function ChatPanel({ ticketId }: { ticketId: string | null }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tickets = useChatStore((s) => s.tickets);
  const messagesByTicket = useChatStore((s) => s.messagesByTicket);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const [input, setInput] = useState('');

  // AI states
  const [aiLoading, setAiLoading] = useState<'suggest' | 'summarize' | 'classify' | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiClassification, setAiClassification] = useState<any>(null);

  const ticket = ticketId ? tickets.find((t) => t.id === ticketId) : null;

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', ticketId],
    queryFn: () => apiGet<Message[]>(`/messages/ticket/${ticketId}`),
    enabled: !!ticketId,
  });

  useEffect(() => {
    if (ticketId && messages.length) {
      setMessages(ticketId, messages);
    }
  }, [ticketId, messages, setMessages]);

  // Reset AI states when switching tickets
  useEffect(() => {
    setAiSuggestion(null);
    setAiSummary(null);
    setAiClassification(null);
  }, [ticketId]);

  const displayMessages = ticketId ? (messagesByTicket[ticketId] ?? messages) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length]);

  async function handleAiSuggest() {
    if (!ticketId || aiLoading) return;
    setAiLoading('suggest');
    setAiSuggestion(null);
    try {
      const res = await apiPost<{ suggestion: string }>(
        `/ai/tickets/${ticketId}/suggest-reply`,
        {},
      );
      setAiSuggestion(res.suggestion);
    } catch (err: any) {
      console.error('AI suggest failed:', err);
      setAiSuggestion('Erro ao gerar sugestão. Tente novamente.');
    } finally {
      setAiLoading(null);
    }
  }

  async function handleAiSummarize() {
    if (!ticketId || aiLoading) return;
    setAiLoading('summarize');
    setAiSummary(null);
    try {
      const res = await apiPost<{ summary: string }>(
        `/ai/tickets/${ticketId}/summarize`,
        {},
      );
      setAiSummary(res.summary);
    } catch (err: any) {
      console.error('AI summarize failed:', err);
      setAiSummary('Erro ao gerar resumo. Tente novamente.');
    } finally {
      setAiLoading(null);
    }
  }

  async function handleAiClassify() {
    if (!ticketId || aiLoading) return;
    setAiLoading('classify');
    setAiClassification(null);
    try {
      const res = await apiPost<{ classification: any }>(
        `/ai/tickets/${ticketId}/classify`,
        {},
      );
      setAiClassification(res.classification);
    } catch (err: any) {
      console.error('AI classify failed:', err);
      setAiClassification({ error: 'Erro ao classificar' });
    } finally {
      setAiLoading(null);
    }
  }

  function handleUseSuggestion() {
    if (aiSuggestion && aiSuggestion !== 'Erro ao gerar sugestão. Tente novamente.') {
      setInput(aiSuggestion);
      setAiSuggestion(null);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketId || !input.trim()) return;
    const content = input.trim();
    setInput('');
    try {
      const created = await apiPost<Message>(`/messages/ticket/${ticketId}/send`, {
        content,
      });
      appendMessage(ticketId, created);
    } catch (err) {
      console.error(err);
    }
  }

  if (!ticketId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Selecione uma conversa
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-14 border-b flex items-center gap-3 px-4 shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={ticket.contact.profilePic ?? undefined} />
          <AvatarFallback>
            {(ticket.contact.name ?? ticket.contact.phone).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{ticket.contact.name ?? ticket.contact.phone}</p>
          <p className="text-xs text-muted-foreground">{ticket.contact.phone}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAiSuggest}
            disabled={!!aiLoading}
            title="Sugerir resposta com IA"
            className="gap-1.5 text-xs"
          >
            {aiLoading === 'suggest' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Sugerir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAiSummarize}
            disabled={!!aiLoading}
            title="Resumir conversa com IA"
            className="gap-1.5 text-xs"
          >
            {aiLoading === 'summarize' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Resumo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAiClassify}
            disabled={!!aiLoading}
            title="Classificar ticket com IA"
            className="gap-1.5 text-xs"
          >
            {aiLoading === 'classify' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Tag className="h-3.5 w-3.5" />
            )}
            Classificar
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2 max-w-[85%]',
              msg.fromMe ? 'ml-auto flex-row-reverse' : ''
            )}
          >
            {!msg.fromMe && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={ticket.contact.profilePic ?? undefined} />
                <AvatarFallback className="text-xs">
                  {(ticket.contact.name ?? ticket.contact.phone).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                msg.fromMe
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p
                className={cn(
                  'text-xs mt-1',
                  msg.fromMe ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}
              >
                {format(new Date(msg.createdAt), 'HH:mm', { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t">
        {/* AI Result Panels */}
        {aiSuggestion && (
          <div className="px-4 pt-3 pb-1">
            <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Sugestão da IA
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-purple-700 dark:text-purple-300 hover:text-purple-900"
                    onClick={handleUseSuggestion}
                  >
                    Usar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setAiSuggestion(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
            </div>
          </div>
        )}

        {aiSummary && (
          <div className="px-4 pt-3 pb-1">
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Resumo da conversa
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setAiSummary(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{aiSummary}</p>
            </div>
          </div>
        )}

        {aiClassification && (
          <div className="px-4 pt-3 pb-1">
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Classificação
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setAiClassification(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {aiClassification.error ? (
                <p className="text-sm text-red-600">{aiClassification.error}</p>
              ) : (
                <div className="text-sm space-y-1">
                  {aiClassification.category && (
                    <p><span className="font-medium">Categoria:</span> {aiClassification.category}</p>
                  )}
                  {aiClassification.urgency && (
                    <p>
                      <span className="font-medium">Urgência:</span>{' '}
                      <span className={cn(
                        'inline-block px-1.5 py-0.5 rounded text-xs font-medium',
                        aiClassification.urgency === 'CRITICA' && 'bg-red-200 text-red-800',
                        aiClassification.urgency === 'ALTA' && 'bg-orange-200 text-orange-800',
                        aiClassification.urgency === 'MEDIA' && 'bg-yellow-200 text-yellow-800',
                        aiClassification.urgency === 'BAIXA' && 'bg-green-200 text-green-800',
                      )}>
                        {aiClassification.urgency}
                      </span>
                    </p>
                  )}
                  {aiClassification.sentiment && (
                    <p><span className="font-medium">Sentimento:</span> {aiClassification.sentiment}</p>
                  )}
                  {aiClassification.reasoning && (
                    <p className="text-muted-foreground text-xs mt-1">{aiClassification.reasoning}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
