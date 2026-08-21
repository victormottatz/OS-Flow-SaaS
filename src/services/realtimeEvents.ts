import { Response } from "express";

interface SSEClient {
  id: string;
  res: Response;
  userId?: string;
}

class RealtimeEventsService {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, res: Response, userId?: string) {
    this.clients.set(id, { id, res, userId });

    // Headers para Server-Sent Events
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    // Mensagem inicial de conexão
    res.write(`data: ${JSON.stringify({ type: "CONNECTED", timestamp: new Date().toISOString() })}\n\n`);

    res.on("close", () => {
      this.clients.delete(id);
    });
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  broadcast(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [_, client] of this.clients) {
      try {
        client.res.write(payload);
      } catch (err) {
        console.warn(`[RealtimeSSE] Erro ao enviar evento para cliente ${client.id}:`, err);
      }
    }
  }

  emitToUser(userId: string, event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [_, client] of this.clients) {
      if (client.userId === userId) {
        try {
          client.res.write(payload);
        } catch (err) {}
      }
    }
  }
}

export const realtimeEvents = new RealtimeEventsService();
