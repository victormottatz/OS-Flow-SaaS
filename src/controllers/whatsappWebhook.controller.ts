import { Request, Response } from "express";
import prisma from "../database/prisma";
import { realtimeEvents } from "../services/realtimeEvents";
import { getBase64FromEvolutionMedia, saveMediaToFile } from "../services/whatsapp";

export class WhatsAppWebhookController {
  async handleWebhook(req: Request, res: Response) {
    try {
      // No ambiente de teste / demo sem credenciais ativas de WhatsApp, ignora a ingestão de mensagens reais
      if (!process.env.WHATSAPP_API_URL && !process.env.WHATSAPP_API_TOKEN) {
        return res.status(200).json({ received: true, ignored: "Ambiente de teste com WhatsApp desconectado" });
      }

      const payload = req.body;
      if (!payload) {
        return res.status(200).json({ received: true });
      }

      const event = String(payload.event || payload.type || "").toLowerCase();
      const rawData = payload.data || payload;

      // Responde imediatamente 200 OK para o webhook não sofrer timeout
      res.status(200).json({ received: true });

      if (!rawData) return;

      // Suporte a lotes / arrays ou objetos aninhados
      let items: any[] = [];
      if (Array.isArray(rawData)) {
        items = rawData;
      } else if (rawData.messages && Array.isArray(rawData.messages)) {
        items = rawData.messages;
      } else if (rawData.data && Array.isArray(rawData.data)) {
        items = rawData.data;
      } else {
        items = [rawData];
      }

      if (
        event === "messages.upsert" ||
        event === "messages_upsert" ||
        event === "send_message" ||
        event === "send.message" ||
        event === "message.create" ||
        event === "messages"
      ) {
        for (const item of items) {
          await this.handleMessageUpsert(item);
        }
      } else if (
        event === "messages.update" ||
        event === "messages_update" ||
        event === "message.update"
      ) {
        for (const item of items) {
          await this.handleMessageUpdate(item);
        }
      } else if (
        event === "connection.update" ||
        event === "connection_update"
      ) {
        realtimeEvents.broadcast("whatsapp_connection", rawData);
      }
    } catch (err: any) {
      console.error("[WhatsApp Webhook] Erro ao processar payload:", err);
    }
  }

  private async handleMessageUpsert(data: any) {
    try {
      if (!data) return;
      const key = data.key || {};
      const remoteJid = key.remoteJid || data.remoteJid;
      if (!remoteJid || remoteJid.includes("@g.us") || remoteJid === "status@broadcast") {
        // Ignora grupos e stories do WhatsApp por padrão para manter a caixa de entrada limpa
        return;
      }

      // Ignora mensagens internas do protocolo do WhatsApp (reações criptografadas, chaves e sincronizações de dispositivos)
      let message = data.message || {};
      if (
        message.protocolMessage ||
        message.senderKeyDistributionMessage ||
        message.encReactionMessage ||
        message.reactionMessage
      ) {
        return;
      }

      const fromMe = Boolean(key.fromMe || data.fromMe);
      const keyId = key.id || data.keyId || data.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const pushName = data.pushName || data.name || (fromMe ? "MGV Suporte" : "Cliente");
      const cleanPhone = remoteJid.replace(/@.*$/, "").replace(/\D/g, "");

      // Extrai o conteúdo da mensagem desempacotando se for efêmera, de visualização única ou editada
      if (message.ephemeralMessage) message = message.ephemeralMessage.message || message;
      if (message.viewOnceMessage) message = message.viewOnceMessage.message || message;
      if (message.viewOnceMessageV2) message = message.viewOnceMessageV2.message || message;
      if (message.documentWithCaptionMessage) message = message.documentWithCaptionMessage.message || message;
      if (message.editedMessage) message = message.editedMessage.message?.protocolMessage?.editedMessage || message;

      let text = "";
      let messageType: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "VIDEO" | "LOCATION" | "STICKER" | "OTHER" = "TEXT";
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
      } else if (message.stickerMessage) {
        text = "🏷️ Figurinha";
        messageType = "STICKER";
        mediaUrl = message.stickerMessage.url || data.mediaUrl;
        mediaMimeType = message.stickerMessage.mimetype || "image/webp";
      } else if (message.audioMessage) {
        text = "🎵 Áudio";
        messageType = "AUDIO";
        mediaUrl = message.audioMessage.url || data.mediaUrl;
        mediaMimeType = message.audioMessage.mimetype || "audio/ogg";
      } else if (message.documentMessage) {
        text = message.documentMessage.caption || message.documentMessage.fileName || "📄 Documento";
        messageType = "DOCUMENT";
        mediaUrl = message.documentMessage.url || data.mediaUrl;
        mediaMimeType = message.documentMessage.mimetype || "application/pdf";
        fileName = message.documentMessage.fileName || "documento.pdf";
      } else if (message.videoMessage) {
        text = message.videoMessage.caption || "🎥 Vídeo";
        messageType = "VIDEO";
        mediaUrl = message.videoMessage.url || data.mediaUrl;
        mediaMimeType = message.videoMessage.mimetype || "video/mp4";
      } else if (data.text || data.body) {
        text = data.text || data.body;
        messageType = "TEXT";
      }

      // Se não há texto, nem mídia e nem tipo especial de arquivo, ignora mensagem vazia
      if (!text.trim() && !mediaUrl && messageType === "TEXT") {
        return;
      }

      // Se for mídia, tenta salvar em arquivo estático local (/uploads/whatsapp/) para nunca expirar
      if (messageType !== "TEXT") {
        try {
          const directBase64 = data.base64 || message.base64 || (message as any)[`${messageType.toLowerCase()}Message`]?.base64;
          if (directBase64) {
            mediaUrl = await saveMediaToFile(directBase64, `wa_${messageType.toLowerCase()}`, mediaMimeType || "application/octet-stream");
          } else if (mediaUrl && mediaUrl.startsWith("data:")) {
            mediaUrl = await saveMediaToFile(mediaUrl, `wa_${messageType.toLowerCase()}`, mediaMimeType || "application/octet-stream");
          } else if (!mediaUrl || mediaUrl.startsWith("http")) {
            // Tenta obter base64 da Evolution API
            const fetchedBase64 = await getBase64FromEvolutionMedia(data);
            if (fetchedBase64) {
              mediaUrl = await saveMediaToFile(fetchedBase64, `wa_${messageType.toLowerCase()}`, mediaMimeType || "application/octet-stream");
            }
          }
        } catch (mediaSaveErr: any) {
          console.warn("[WhatsApp Webhook] Não foi possível persistir mídia localmente:", mediaSaveErr.message);
        }
      }

      // 1. Localiza ou cadastra o Chat (busca por remoteJid ou phoneNumber para unificar LIDs)
      let chat = await (prisma as any).whatsappChat.findFirst({
        where: {
          OR: [
            { remoteJid },
            ...(cleanPhone.length >= 8 ? [{ phoneNumber: { contains: cleanPhone.slice(-8) } }] : [])
          ]
        },
        include: {
          client: {
            select: { id: true, name: true, phone: true, email: true, cpfCnpj: true }
          },
          activeOrder: {
            select: { id: true, osNumber: true, status: true, totalCost: true }
          }
        }
      });

      // Busca cliente correspondente pelo telefone se o chat ainda não tiver vínculo
      let matchedClient: any = chat?.client || null;
      let matchedOrder: any = chat?.activeOrder || null;

      if (!chat || !chat.clientId) {
        const suffix = cleanPhone.slice(-8); // Últimos 8 dígitos para comparação segura
        if (suffix.length >= 8) {
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
          },
          include: {
            client: {
              select: { id: true, name: true, phone: true, email: true, cpfCnpj: true }
            },
            activeOrder: {
              select: { id: true, osNumber: true, status: true, totalCost: true }
            }
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
          },
          include: {
            client: {
              select: { id: true, name: true, phone: true, email: true, cpfCnpj: true }
            },
            activeOrder: {
              select: { id: true, osNumber: true, status: true, totalCost: true }
            }
          }
        });
      }

      // 2. Salva o registro da Mensagem (com proteção contra duplicata pelo keyId)
      let savedMessage: any = null;
      if (keyId) {
        const existingMessage = await (prisma as any).whatsappMessage.findFirst({
          where: {
            OR: [
              { keyId },
              { AND: [{ remoteJid }, { text }, { fromMe }, { timestamp: { gte: new Date(Date.now() - 5000) } }] }
            ]
          }
        });

        if (existingMessage) {
          savedMessage = await (prisma as any).whatsappMessage.update({
            where: { id: existingMessage.id },
            data: {
              mediaUrl: mediaUrl || existingMessage.mediaUrl,
              status: fromMe ? existingMessage.status : "READ"
            }
          });
        }
      }

      if (!savedMessage) {
        savedMessage = await (prisma as any).whatsappMessage.create({
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
      }

      // 3. Notifica o Frontend via SSE em tempo real (emissão broadcast instantânea)
      const broadcastPayload = {
        chatId: chat.id,
        message: savedMessage,
        chat: {
          ...chat,
          client: matchedClient ? { id: matchedClient.id, name: matchedClient.name, phone: matchedClient.phone } : null,
          activeOrder: matchedOrder ? { id: matchedOrder.id, osNumber: matchedOrder.osNumber, status: matchedOrder.status } : null
        }
      };

      realtimeEvents.broadcast("new_message", broadcastPayload);
      realtimeEvents.broadcast("chat_updated", { chat: broadcastPayload.chat });
    } catch (err) {
      console.error("[WhatsApp Webhook] Erro ao salvar mensagem recebida:", err);
    }
  }

  private async handleMessageUpdate(data: any) {
    try {
      const updates = Array.isArray(data) ? data : [data];
      for (const item of updates) {
        const key = item.key || {};
        const keyId = key.id || item.id || item.messageId;
        const updateStatus = item.update?.status ?? item.status;
        if (!keyId || updateStatus === undefined) continue;

        let mappedStatus: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" = "SENT";
        const statusStr = String(updateStatus).toUpperCase();

        if (statusStr === "READ" || statusStr === "4" || statusStr === "PLAYED" || statusStr === "5" || statusStr === "VIEWED") {
          mappedStatus = "READ";
        } else if (statusStr === "DELIVERY_ACK" || statusStr === "3" || statusStr === "DELIVERED" || statusStr === "RECEIVED") {
          mappedStatus = "DELIVERED";
        } else if (statusStr === "SERVER_ACK" || statusStr === "2" || statusStr === "SENT" || statusStr === "SEND") {
          mappedStatus = "SENT";
        } else if (statusStr === "PENDING" || statusStr === "1") {
          mappedStatus = "PENDING";
        } else if (statusStr === "ERROR" || statusStr === "FAILED" || statusStr === "0") {
          mappedStatus = "FAILED";
        }

        const messages = await (prisma as any).whatsappMessage.findMany({
          where: {
            OR: [
              { keyId },
              { id: keyId }
            ]
          }
        });

        if (messages.length > 0) {
          await (prisma as any).whatsappMessage.updateMany({
            where: {
              OR: [
                { keyId },
                { id: keyId }
              ]
            },
            data: { status: mappedStatus }
          });

          for (const msg of messages) {
            realtimeEvents.broadcast("message_status_update", {
              keyId: msg.keyId,
              messageId: msg.id,
              chatId: msg.chatId,
              status: mappedStatus
            });
          }
        }
      }
    } catch (err) {
      console.error("[WhatsApp Webhook] Erro ao atualizar status da mensagem:", err);
    }
  }
}

export const whatsAppWebhookController = new WhatsAppWebhookController();
