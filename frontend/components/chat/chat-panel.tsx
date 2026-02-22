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
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, Ticket } from '@/stores/chat-store';

export function ChatPanel({ ticketId }: { ticketId: string | null }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tickets = useChatStore((s) => s.tickets);
  const messagesByTicket = useChatStore((s) => s.messagesByTicket);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const [input, setInput] = useState('');

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

  const displayMessages = ticketId ? (messagesByTicket[ticketId] ?? messages) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length]);

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

      <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
