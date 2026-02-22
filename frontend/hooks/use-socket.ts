'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import type { Message, Ticket } from '@/stores/chat-store';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const updateTicket = useChatStore((s) => s.updateTicket);
  const updateTicketStep = useChatStore((s) => s.updateTicketStep);

  useEffect(() => {
    if (!token) return;
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('message.created', (payload: Message & { ticketId: string }) => {
      if (payload.ticketId) {
        appendMessage(payload.ticketId, payload);
      }
    });

    socket.on('ticket.updated', (payload: { ticketId?: string } & Partial<Ticket>) => {
      if (payload.id) {
        updateTicket(payload as Partial<Ticket> & { id: string });
      }
    });

    socket.on('ticket.moved', (payload: { ticketId: string; funnelStepId: string }) => {
      updateTicketStep(payload.ticketId, payload.funnelStepId);
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [token, appendMessage, updateTicket, updateTicketStep]);

  return socketRef.current;
}
