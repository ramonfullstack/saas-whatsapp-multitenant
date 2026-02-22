import { create } from 'zustand';

export interface Message {
  id: string;
  ticketId: string;
  content: string;
  fromMe: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  status?: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  contactId: string;
  contact: { id: string; name: string | null; phone: string; profilePic?: string | null };
  funnelStep: { id: string; name: string; color?: string | null };
  assignedTo?: { id: string; name: string; email: string } | null;
  lastMessageAt: string;
  messages?: Message[];
  _count?: { messages: number };
}

interface ChatState {
  selectedTicketId: string | null;
  tickets: Ticket[];
  messagesByTicket: Record<string, Message[]>;
  typing: Record<string, boolean>;
  setTickets: (tickets: Ticket[]) => void;
  setSelectedTicket: (id: string | null) => void;
  setMessages: (ticketId: string, messages: Message[]) => void;
  appendMessage: (ticketId: string, message: Message) => void;
  setTyping: (ticketId: string, value: boolean) => void;
  updateTicket: (ticket: Partial<Ticket> & { id: string }) => void;
  updateTicketStep: (ticketId: string, funnelStepId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedTicketId: null,
  tickets: [],
  messagesByTicket: {},
  typing: {},
  setTickets: (tickets) => set({ tickets }),
  setSelectedTicket: (id) => set({ selectedTicketId: id }),
  setMessages: (ticketId, messages) =>
    set((s) => ({
      messagesByTicket: { ...s.messagesByTicket, [ticketId]: messages },
    })),
  appendMessage: (ticketId, message) =>
    set((s) => {
      const list = s.messagesByTicket[ticketId] ?? [];
      if (list.some((m) => m.id === message.id)) return s;
      return {
        messagesByTicket: {
          ...s.messagesByTicket,
          [ticketId]: [...list, message],
        },
      };
    }),
  setTyping: (ticketId, value) =>
    set((s) => ({ typing: { ...s.typing, [ticketId]: value } })),
  updateTicket: (ticket) =>
    set((s) => ({
      tickets: s.tickets.map((t) => (t.id === ticket.id ? { ...t, ...ticket } : t)),
    })),
  updateTicketStep: (ticketId, funnelStepId) =>
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === ticketId ? { ...t, funnelStepId, funnelStep: { ...t.funnelStep, id: funnelStepId } } : t
      ),
    })),
}));
