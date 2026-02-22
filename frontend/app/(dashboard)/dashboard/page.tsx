'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/services/api';
import { useChatStore } from '@/stores/chat-store';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatPanel } from '@/components/chat/chat-panel';
import type { Ticket } from '@/stores/chat-store';

function ticketsFetcher(): Promise<Ticket[]> {
  return apiGet<Ticket[]>('/tickets');
}

export default function DashboardPage() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: ticketsFetcher,
  });
  const setTickets = useChatStore((s) => s.setTickets);
  const selectedTicketId = useChatStore((s) => s.selectedTicketId);

  useEffect(() => {
    setTickets(tickets);
  }, [tickets, setTickets]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <ChatSidebar tickets={tickets} loading={isLoading} />
      <ChatPanel ticketId={selectedTicketId} />
    </div>
  );
}
