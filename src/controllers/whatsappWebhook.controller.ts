import { Request, Response } from "express";
import prisma from "../database/prisma";
import { realtimeEvents } from "../services/realtimeEvents";
import { formatPhoneNumber } from "../services/whatsapp";

export class WhatsAppWebhookController {
  async handleWebhook(req: Request, res: Response) {
    try {
      const payload = req.body;
      const event = payload.event || payload.type;
      const data = payload.data || payload;

      // Responde imediatamente 200 OK para o webhook não expirar
      res.status(200).json({ received: true });

      if (!event || !data) return;

      if (event === "messages.upsert" || event === "MESSAGES_UPSERT" || event === "messages.upsert" || event === "SEND_MESSAGE") {
        await this.handleMessageUpsert(data);
      } else if (event === "messages.update" || event === "MESSAGES_UPDATE") {
        await this.handleMessageUpdate(data);
      } else if (event === "connection.update" || event === "CONNECTION_UPDATE") {
        realtimeEvents.broadcast("whatsapp_connection", data);
      }
    } catch (err: any) {
      console.error("[WhatsApp Webhook] Erro ao processar payload:", err);
    }
  }

  private async handleMessageUpsert(data: any) {
    try {
      const key = data.key || {};
      const remoteJid = key.remoteJid;
      if (!remoteJid || remoteJid.includes("@g.us") || remoteJid === "status@broadcast") {
        // Ignora grupos e stories do WhatsApp por padrão para não poluir
        return;
      }

      const fromMe = Boolean(key.fromMe);
      const keyId = key.id || `msg_${Date.now()}`;
      const pushName = data.pushName || (fromMe ? "MGV Suporte" : "Cliente");
      const cleanPhone = remoteJid.replace(/@.*$/, "").replace(/\D/g, "");

      // Extrai texto e tipo de mensagem
      const message = data.message || {};
      let text = "";
      let messageType: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "VIDEO" | "LOCATION" | "OTHER" = "TEXT";
      let mediaUrl: string | undefined;
      let mediaMimeType: string | undefined;
      let fileName: string | undefined;

      if (message.conversation) {
        text = message.conversation;
        messageType = "TEXT";
      } else if (message.extendedTextMessage?.text) {
        text = message.extendedTextMessage.text;
        messageType = "TEXT";
      } else if (message.imageMessage) {
        text = message.imageMessage.caption || "";
        messageType = "IMAGE";
        mediaUrl = message.imageMessage.url || data.mediaUrl;
        mediaMimeType = message.imageMessage.mimetype || "image/jpeg";
      } else if (message.audioMessage) {
        text = "🎵 Áudio recebido";
        messageType = "AUDIO";
        mediaUrl = message.audioMessage.url || data.mediaUrl;
        mediaMimeType = message.audioMessage.mimetype || "audio/ogg";
      } else if (message.documentMessage) {
        text = message.documentMessage.caption || message.documentMessage.fileName || "📄 Documento recebido";
        messageType = "DOCUMENT";
        mediaUrl = message.documentMessage.url || data.mediaUrl;
        mediaMimeType = message.documentMessage.mimetype || "application/pdf";
        fileName = message.documentMessage.fileName;
      } else if (message.videoMessage) {
        text = message.videoMessage.caption || "🎥 Vídeo recebido";
        messageType = "VIDEO";
        mediaUrl = message.videoMessage.url || data.mediaUrl;
        mediaMimeType = message.videoMessage.mimetype || "video/mp4";
      }

      // 1. Localiza ou cadastra o Chat
      let chat = await (prisma as any).whatsappChat.findUnique({
        where: { remoteJid }
      });

      // Busca cliente correspondente pelo telefone
      let matchedClient: any = null;
      let matchedOrder: any = null;

      if (!chat || !chat.clientId) {
        // Tenta encontrar cliente pelo número
        const suffix = cleanPhone.slice(-8); // Últimos 8 dígitos para comparação segura
        const clients = await prisma.client.findMany({
          where: {
            phone: { contains: suffix },
            deletedAt: null
          },
          include: {
            orders: {
              orderBy: { createdAt: "desc" as any },
              take: 1
            }
          }
        });

        if (clients.length > 0) {
          matchedClient = clients[0];
          if (matchedClient.orders?.length > 0) {
            matchedOrder = matchedClient.orders[0];
          }
        }
      }

      const chatName = chat?.name || (matchedClient ? matchedClient.name : pushName);

      if (!chat) {
        chat = await (prisma as any).whatsappChat.create({
          data: {
            remoteJid,
            name: chatName,
            phoneNumber: cleanPhone,
            profilePicUrl: data.profilePicUrl || null,
            clientId: matchedClient?.id || null,
            activeOrderId: matchedOrder?.id || null,
            lastMessageText: text || `[${messageType}]`,
            lastMessageAt: new Date(),
            unreadCount: fromMe ? 0 : 1
          }
        });
      } else {
        chat = await (prisma as any).whatsappChat.update({
          where: { id: chat.id },
          data: {
            name: chat.name || chatName,
            profilePicUrl: data.profilePicUrl || undefined,
            lastMessageText: text || `[${messageType}]`,
            lastMessageAt: new Date(),
            unreadCount: fromMe ? chat.unreadCount : { increment: 1 },
            clientId: chat.clientId || matchedClient?.id || null,
            activeOrderId: chat.activeOrderId || matchedOrder?.id || null
          }
        });
      }

      // 2. Salva o registro da Mensagem
      const savedMessage = await (prisma as any).whatsappMessage.create({
        data: {
          chatId: chat.id,
          remoteJid,
          keyId,
          fromMe,
          senderName: fromMe ? "MGV Suporte" : pushName,
          messageType,
          text,
          mediaUrl,
          mediaMimeType,
          fileName,
          status: fromMe ? "SENT" : "READ",
          orderId: chat.activeOrderId || null,
          timestamp: new Date()
        }
      });

      // 3. Notifica o Frontend via SSE
      realtimeEvents.broadcast("new_message", {
        chatId: chat.id,
        message: savedMessage,
        chat: {
          ...chat,
          client: matchedClient ? { id: matchedClient.id, name: matchedClient.name, phone: matchedClient.phone } : null,
          activeOrder: matchedOrder ? { id: matchedOrder.id, osNumber: matchedOrder.osNumber, status: matchedOrder.status } : null
        }
      });
    } catch (err) {
      console.error("[WhatsApp Webhook] Erro ao salvar mensagem recebida:", err);
    }
  }

  private async handleMessageUpdate(data: any) {
    try {
      const updates = Array.isArray(data) ? data : [data];
      for (const item of updates) {
        const key = item.key || {};
        const keyId = key.id;
        const updateStatus = item.update?.status || item.status;
        if (!keyId || !updateStatus) continue;

        let mappedStatus: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" = "SENT";
        if (updateStatus === "DELIVERY_ACK" || updateStatus === 3 || updateStatus === "DELIVERED") {
          mappedStatus = "DELIVERED";
        } else if (updateStatus === "READ" || updateStatus === 4 || updateStatus === "PLAYED") {
          mappedStatus = "READ";
        } else if (updateStatus === "ERROR" || updateStatus === "FAILED" || updateStatus === 0) {
          mappedStatus = "FAILED";
        }

        const updated = await (prisma as any).whatsappMessage.updateMany({
          where: { keyId },
          data: { status: mappedStatus }
        });

        if (updated.count > 0) {
          realtimeEvents.broadcast("message_status_update", { keyId, status: mappedStatus });
        }
      }
    } catch (err) {
      console.error("[WhatsApp Webhook] Erro ao atualizar status da mensagem:", err);
    }
  }
}

export const whatsAppWebhookController = new WhatsAppWebhookController();
