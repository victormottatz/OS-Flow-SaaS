import { Response } from "express";

interface SSEClient {
  id: string;
  res: Response;
  userId?: string;
}

class RealtimeEventsService {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    // Envia keep-alive a cada 25 segundos para manter conexões SSE ativas através de proxies e roteadores
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  private sendHeartbeat() {
    if (this.clients.size === 0) return;
    const pingPayload = `: ping\n\n`;
    for (const [id, client] of this.clients) {
      try {
        client.res.write(pingPayload);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  addClient(id: string, res: Response, userId?: string) {
    this.clients.set(id, { id, res, userId });

    // Headers para Server-Sent Events
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no" // Desativa buffer no NGINX para tempo real imediato
    });

    // Mensagem inicial de conexão
    res.write(`data: ${JSON.stringify({ type: "CONNECTED", timestamp: new Date().toISOString() })}\n\n`);

    res.on("close", () => {
      this.clients.delete(id);
    });

    res.on("error", () => {
      this.clients.delete(id);
    });
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  broadcast(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.clients) {
      try {
        client.res.write(payload);
      } catch (err) {
        console.warn(`[RealtimeSSE] Erro ao enviar evento para cliente ${client.id}:`, err);
        this.clients.delete(id);
      }
    }
  }

  emitToUser(userId: string, event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.clients) {
      if (client.userId === userId) {
        try {
          client.res.write(payload);
        } catch (err) {
          this.clients.delete(id);
        }
      }
    }
  }
}

export const realtimeEvents = new RealtimeEventsService();

