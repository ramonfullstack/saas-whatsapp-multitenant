'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useChatStore } from '@/stores/chat-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/stores/chat-store';

export function ChatSidebar({
  tickets,
  loading,
}: {
  tickets: Ticket[];
  loading?: boolean;
}) {
  const selectedTicketId = useChatStore((s) => s.selectedTicketId);
  const setSelectedTicket = useChatStore((s) => s.setSelectedTicket);

  if (loading) {
    return (
      <div className="w-80 border-r flex flex-col items-center justify-center p-4 text-muted-foreground">
        Carregando conversas...
      </div>
    );
  }

  return (
    <div className="w-80 border-r flex flex-col overflow-hidden">
      <div className="p-3 border-b">
        <h2 className="font-semibold">Conversas</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Nenhuma conversa ainda.
          </div>
        ) : (
          tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => setSelectedTicket(ticket.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 text-left border-b hover:bg-muted/50 transition-colors',
                selectedTicketId === ticket.id && 'bg-muted'
              )}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={ticket.contact.profilePic ?? undefined} />
                <AvatarFallback>
                  {(ticket.contact.name ?? ticket.contact.phone).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {ticket.contact.name ?? ticket.contact.phone}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {ticket.contact.phone}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(ticket.lastMessageAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
