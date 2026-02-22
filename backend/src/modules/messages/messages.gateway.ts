import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class MessagesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(private readonly jwt: JwtService) {}

  afterInit(): void {
    this.logger.log('WebSocket gateway initialized');
  }

  async handleConnection(client: { handshake: { auth?: { token?: string }; query?: { token?: string }; id: string }; join: (room: string) => void }) {
    const token =
      client.handshake?.auth?.token ?? client.handshake?.query?.token;
    if (!token) return;
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      if (payload.companyId) {
        client.join(this.getRoom(payload.companyId));
      }
    } catch {
      this.logger.warn(`Socket ${client.handshake.id} invalid token`);
    }
  }

  handleDisconnect(): void {}

  getRoom(companyId: string): string {
    return `company:${companyId}`;
  }

  emitMessageCreated(companyId: string, payload: unknown): void {
    this.server.to(this.getRoom(companyId)).emit('message.created', payload);
  }

  emitTicketUpdated(companyId: string, ticketId: string, payload?: unknown): void {
    this.server
      .to(this.getRoom(companyId))
      .emit('ticket.updated', payload ?? { ticketId });
  }

  emitTicketMoved(
    companyId: string,
    payload: { ticketId: string; funnelStepId: string },
  ): void {
    this.server.to(this.getRoom(companyId)).emit('ticket.moved', payload);
  }

  emitUserOnline(companyId: string, payload: { userId: string; online: boolean }): void {
    this.server.to(this.getRoom(companyId)).emit('user.online', payload);
  }
}
