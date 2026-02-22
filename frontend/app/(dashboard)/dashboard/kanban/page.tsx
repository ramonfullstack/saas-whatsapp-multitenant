'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/services/api';
import { useChatStore } from '@/stores/chat-store';
import { useSocket } from '@/hooks/use-socket';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/stores/chat-store';

interface FunnelStep {
  id: string;
  name: string;
  order: number;
  color: string | null;
}

interface Funnel {
  id: string;
  name: string;
  isDefault?: boolean;
  steps: FunnelStep[];
}

export default function KanbanPage() {
  useSocket();
  const { data: funnels = [] } = useQuery({
    queryKey: ['funnels'],
    queryFn: () => apiGet<Funnel[]>('/funnels'),
  });
  const { data: tickets = [], refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => apiGet<Ticket[]>('/tickets'),
  });
  const updateTicketStep = useChatStore((s) => s.updateTicketStep);

  const defaultFunnel = funnels.find((f) => f.isDefault) ?? funnels[0];
  const steps = defaultFunnel?.steps ?? [];

  async function handleMove(ticketId: string, funnelStepId: string) {
    try {
      await apiPatch(`/tickets/${ticketId}/move`, { funnelStepId });
      updateTicketStep(ticketId, funnelStepId);
      refetch();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4">
      <h1 className="text-xl font-semibold mb-4">Kanban - Vendas</h1>
      <div className="flex-1 overflow-x-auto flex gap-4 pb-4">
        {steps.map((step) => {
          const stepTickets = tickets.filter(
            (t) => t.funnelStep?.id === step.id
          );
          return (
            <div
              key={step.id}
              className="w-72 shrink-0 rounded-lg border bg-card flex flex-col overflow-hidden"
            >
              <div
                className="p-3 text-sm font-medium text-white shrink-0"
                style={{
                  backgroundColor: step.color ?? '#6b7280',
                }}
              >
                {step.name}
              </div>
              <div
                className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const ticketId = e.dataTransfer.getData('ticketId');
                  if (ticketId) handleMove(ticketId, step.id);
                }}
              >
                {stepTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('ticketId', ticket.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className={cn(
                      'p-3 rounded-md border bg-background cursor-grab active:cursor-grabbing',
                      'hover:bg-muted/50 transition-colors'
                    )}
                  >
                    <p className="font-medium truncate">
                      {ticket.contact?.name ?? ticket.contact?.phone ?? 'Contato'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ticket.contact?.phone}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
