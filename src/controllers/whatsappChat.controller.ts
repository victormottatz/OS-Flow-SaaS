import { Request, Response } from "express";
import prisma from "../database/prisma";
import { realtimeEvents } from "../services/realtimeEvents";
import {
  sendWhatsAppTextMessage,
  sendWhatsAppDocumentMessage,
  sendWhatsAppAudioMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppGenericDocumentMessage,
  saveMediaToFile,
  getWhatsAppConfig,
  formatPhoneNumber
} from "../services/whatsapp";
import { buildDocumentPdf, PdfOsData } from "../services/pdfService";
import { DOCUMENT_TEMPLATES, DocumentTemplateId } from "../config/documents.config";

export class WhatsAppChatController {
  // Conexão SSE para eventos em tempo real
  subscribeEvents(req: Request, res: Response) {
    const clientId = `sse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const userId = (req as any).user?.id;
    realtimeEvents.addClient(clientId, res, userId);
  }

  // Lista todos os chats com dados resumidos e dados da OS
  async getChats(req: Request, res: Response) {
    try {
      const { search, filter } = req.query;

      let whereClause: any = {};
      if (filter === "unread") {
        whereClause.unreadCount = { gt: 0 };
      } else if (filter === "with_os") {
        whereClause.activeOrderId = { not: null };
      } else if (filter === "contacts" || filter === "whatsapp_contacts") {
        whereClause.activeOrderId = null;
      }

      if (search && typeof search === "string") {
        whereClause.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search } },
          { lastMessageText: { contains: search, mode: "insensitive" } }
        ];
      }

      const chats = await (prisma as any).whatsappChat.findMany({
        where: whereClause,
        include: {
          client: {
            select: { id: true, name: true, phone: true, email: true, cpfCnpj: true }
          },
          activeOrder: {
            select: {
              id: true,
              osNumber: true,
              status: true,
              totalCost: true,
              deviceBrand: true,
              deviceModel: true,
              reportedDefect: true,
              diagnostic: true
            }
          }
        },
        orderBy: { lastMessageAt: "desc" }
      });

      res.json(chats);
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao listar chats:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // Obtém mensagens de uma conversa
  async getMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { limit = 100 } = req.query;

      const messages = await (prisma as any).whatsappMessage.findMany({
        where: { chatId },
        orderBy: { timestamp: "asc" },
        take: Number(limit)
      });

      res.json(messages);
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao buscar mensagens:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // Proxy e Descriptografia de Mídia (Áudio, Imagem, Documento, Vídeo)
  async getMessageMedia(req: Request, res: Response) {
    try {
      const { messageId } = req.params;

      const message = await (prisma as any).whatsappMessage.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        res.status(404).send("Mensagem não encontrada.");
        return;
      }

      const path = await import("path");
      const fs = await import("fs/promises");

      // 1. Se já for um arquivo local salvo em /uploads/whatsapp/...
      if (message.mediaUrl && message.mediaUrl.startsWith("/uploads/")) {
        const localFilePath = path.join(process.cwd(), "public", message.mediaUrl);
        try {
          await fs.access(localFilePath);
          return res.sendFile(localFilePath);
        } catch (err) {
          // Arquivo local não encontrado, tenta descriptografar novamente
        }
      }

      // 2. Se for data URL em base64
      if (message.mediaUrl && message.mediaUrl.startsWith("data:")) {
        const parts = message.mediaUrl.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (message.mediaMimeType || "application/octet-stream");
        const buffer = Buffer.from(parts[1], "base64");
        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Length", buffer.length);
        return res.send(buffer);
      }

      // 3. Descriptografa via Evolution API
      const { apiUrl, apiToken, instanceName } = await getWhatsAppConfig();
      if (!apiUrl || !apiToken || !message.keyId) {
        res.status(404).send("Configurações do WhatsApp ou keyId ausentes.");
        return;
      }

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      const evoRes = await fetch(`${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiToken
        },
        body: JSON.stringify({
          message: {
            key: {
              id: message.keyId,
              remoteJid: message.remoteJid,
              fromMe: message.fromMe
            }
          },
          convertToMp4: false
        })
      });

      if (!evoRes.ok) {
        const errText = await evoRes.text();
        console.warn(`[WhatsApp Chat] Falha ao descriptografar mídia na Evolution API: HTTP ${evoRes.status} - ${errText}`);
        res.status(502).send("Mídia indisponível ou expirada no WhatsApp.");
        return;
      }

      const evoData = await evoRes.json();
      const base64Str = evoData.base64 || evoData.data;

      if (!base64Str) {
        res.status(404).send("Nenhum dado de mídia retornado pela Evolution API.");
        return;
      }

      const mime = evoData.mimetype || message.mediaMimeType || (message.messageType === "AUDIO" ? "audio/ogg" : message.messageType === "IMAGE" ? "image/jpeg" : "application/pdf");

      // Salva localmente em cache para as próximas chamadas
      let localUrl = "";
      try {
        localUrl = await saveMediaToFile(base64Str, `wa_${message.messageType.toLowerCase()}`, mime);
        await (prisma as any).whatsappMessage.update({
          where: { id: message.id },
          data: {
            mediaUrl: localUrl,
            mediaMimeType: mime
          }
        });
      } catch (saveErr: any) {
        console.warn("[WhatsApp Chat] Falha ao salvar mídia em cache:", saveErr.message);
      }

      const buffer = Buffer.from(base64Str.replace(/^data:[^;]+;base64,/, ""), "base64");
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buffer);
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao servir mídia:", err);
      res.status(500).send("Erro interno ao servir mídia.");
    }
  }

  // Enviar mensagem de texto manual
  async sendText(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { text } = req.body;
      const user = (req as any).user;

      if (!text || !text.trim()) {
        res.status(400).json({ error: "Texto da mensagem é obrigatório." });
        return;
      }

      const chat = await (prisma as any).whatsappChat.findUnique({
        where: { id: chatId },
        include: { activeOrder: true, client: true }
      });

      if (!chat) {
        res.status(404).json({ error: "Conversa não encontrada." });
        return;
      }

      const senderName = user?.name || "MGV Atendimento";

      // 1. Salva a mensagem no banco
      const savedMessage = await (prisma as any).whatsappMessage.create({
        data: {
          chatId: chat.id,
          remoteJid: chat.remoteJid,
          fromMe: true,
          senderName,
          messageType: "TEXT",
          text,
          status: "PENDING",
          orderId: chat.activeOrderId || null,
          timestamp: new Date()
        }
      });

      // Atualiza o chat
      await (prisma as any).whatsappChat.update({
        where: { id: chat.id },
        data: {
          lastMessageText: text,
          lastMessageAt: new Date()
        }
      });

      // 2. Notifica o Frontend via SSE
      realtimeEvents.broadcast("new_message", {
        chatId: chat.id,
        message: savedMessage
      });

      // 3. Despacha via WhatsApp em background
      setTimeout(async () => {
        try {
          const result = await sendWhatsAppTextMessage(chat.phoneNumber, text);
          const newKeyId = result.keyId || savedMessage.keyId;
          await (prisma as any).whatsappMessage.update({
            where: { id: savedMessage.id },
            data: {
              keyId: newKeyId,
              status: result.success ? "SENT" : "FAILED",
              errorDetail: result.error || null
            }
          });
          realtimeEvents.broadcast("message_status_update", {
            keyId: newKeyId,
            messageId: savedMessage.id,
            chatId: chat.id,
            status: result.success ? "SENT" : "FAILED"
          });
        } catch (dispatchErr: any) {
          console.error("[WhatsApp Chat] Erro ao despachar mensagem:", dispatchErr);
        }
      }, 50);

      res.status(201).json(savedMessage);
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao enviar texto:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // Envia gravação de áudio (PTT) gravada no navegador
  async sendAudio(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { audioBase64 } = req.body;
      const user = (req as any).user;

      if (!audioBase64) {
        res.status(400).json({ error: "Áudio em Base64 é obrigatório." });
        return;
      }

      const chat = await (prisma as any).whatsappChat.findUnique({
        where: { id: chatId }
      });

      if (!chat) {
        res.status(404).json({ error: "Conversa não encontrada." });
        return;
      }

      const senderName = user?.name || "MGV Atendimento";

      // Salva arquivo local para reprodução imediata e duradoura no frontend
      let mediaUrl = "";
      try {
        mediaUrl = await saveMediaToFile(audioBase64, "wa_voice", "audio/ogg");
      } catch (saveErr: any) {
        console.warn("[WhatsApp Chat] Falha ao salvar áudio localmente:", saveErr.message);
      }

      const savedMessage = await (prisma as any).whatsappMessage.create({
        data: {
          chatId: chat.id,
          remoteJid: chat.remoteJid,
          fromMe: true,
          senderName,
          messageType: "AUDIO",
          text: "🎵 Mensagem de voz",
          mediaUrl: mediaUrl || audioBase64,
          mediaMimeType: "audio/ogg",
          status: "PENDING",
          orderId: chat.activeOrderId || null,
          timestamp: new Date()
        }
      });

      await (prisma as any).whatsappChat.update({
        where: { id: chat.id },
        data: {
          lastMessageText: "🎵 Mensagem de voz",
          lastMessageAt: new Date()
        }
      });

      realtimeEvents.broadcast("new_message", {
        chatId: chat.id,
        message: savedMessage
      });

      setTimeout(async () => {
        try {
          const result = await sendWhatsAppAudioMessage(chat.phoneNumber, audioBase64, true);
          const newKeyId = result.keyId || savedMessage.keyId;
          await (prisma as any).whatsappMessage.update({
            where: { id: savedMessage.id },
            data: {
              keyId: newKeyId,
              status: result.success ? "SENT" : "FAILED",
              errorDetail: result.error || null
            }
          });
          realtimeEvents.broadcast("message_status_update", {
            keyId: newKeyId,
            messageId: savedMessage.id,
            chatId: chat.id,
            status: result.success ? "SENT" : "FAILED"
          });
        } catch (dispatchErr: any) {
          console.error("[WhatsApp Chat] Erro ao despachar áudio:", dispatchErr);
        }
      }, 50);

      res.status(201).json(savedMessage);
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao enviar áudio:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // Envia mídia genérica (imagem ou documento/PDF com legenda)
  async sendMedia(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { fileBase64, fileName, mimeType, caption = "", messageType = "DOCUMENT" } = req.body;
      const user = (req as any).user;

      if (!fileBase64) {
        res.status(400).json({ error: "Conteúdo do arquivo em Base64 é obrigatório." });
        return;
      }

      const chat = await (prisma as any).whatsappChat.findUnique({
        where: { id: chatId }
      });

      if (!chat) {
        res.status(404).json({ error: "Conversa não encontrada." });
        return;
      }

      const senderName = user?.name || "MGV Atendimento";

      // Salva localmente
      let mediaUrl = "";
      try {
        mediaUrl = await saveMediaToFile(fileBase64, `wa_${messageType.toLowerCase()}`, mimeType || "application/octet-stream");
      } catch (saveErr: any) {
        console.warn("[WhatsApp Chat] Falha ao salvar mídia localmente:", saveErr.message);
      }

      const isImage = messageType === "IMAGE" || mimeType?.startsWith("image/");
      const actualType = isImage ? "IMAGE" : "DOCUMENT";

      const savedMessage = await (prisma as any).whatsappMessage.create({
        data: {
          chatId: chat.id,
          remoteJid: chat.remoteJid,
          fromMe: true,
          senderName,
          messageType: actualType,
          text: caption || (actualType === "IMAGE" ? "📷 Foto" : `📄 ${fileName || "Documento"}`),
          mediaUrl: mediaUrl || fileBase64,
          mediaMimeType: mimeType || (isImage ? "image/jpeg" : "application/pdf"),
          fileName: fileName || (isImage ? "foto.jpg" : "documento.pdf"),
          status: "PENDING",
          orderId: chat.activeOrderId || null,
          timestamp: new Date()
        }
      });

      await (prisma as any).whatsappChat.update({
        where: { id: chat.id },
        data: {
          lastMessageText: caption || (actualType === "IMAGE" ? "📷 Foto" : `📄 ${fileName || "Documento"}`),
          lastMessageAt: new Date()
        }
      });

      realtimeEvents.broadcast("new_message", {
        chatId: chat.id,
        message: savedMessage
      });

      setTimeout(async () => {
        try {
          let result: { success: boolean; keyId?: string; error?: string };
          if (actualType === "IMAGE") {
            result = await sendWhatsAppImageMessage(chat.phoneNumber, fileBase64, fileName || "imagem.jpg", caption, mimeType);
          } else {
            result = await sendWhatsAppGenericDocumentMessage(chat.phoneNumber, fileBase64, fileName || "documento.pdf", mimeType, caption);
          }

          const newKeyId = result.keyId || savedMessage.keyId;
          await (prisma as any).whatsappMessage.update({
            where: { id: savedMessage.id },
            data: {
              keyId: newKeyId,
              status: result.success ? "SENT" : "FAILED",
              errorDetail: result.error || null
            }
          });
          realtimeEvents.broadcast("message_status_update", {
            keyId: newKeyId,
            messageId: savedMessage.id,
            chatId: chat.id,
            status: result.success ? "SENT" : "FAILED"
          });
        } catch (dispatchErr: any) {
          console.error("[WhatsApp Chat] Erro ao despachar mídia:", dispatchErr);
        }
      }, 50);

      res.status(201).json(savedMessage);
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao enviar mídia:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // Envia documento oficial de OS (Orçamento, Laudo, etc) gerando PDF automaticamente
  async sendTemplateOs(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { templateId, customMessage } = req.body;
      const user = (req as any).user;

      if (!templateId) {
        res.status(400).json({ error: "templateId é obrigatório." });
        return;
      }

      const chat = await (prisma as any).whatsappChat.findUnique({
        where: { id: chatId },
        include: {
          activeOrder: {
            include: {
              client: true,
              device: true
            }
          }
        }
      });

      if (!chat) {
        res.status(404).json({ error: "Conversa não encontrada." });
        return;
      }

      if (!chat.activeOrder) {
        res.status(400).json({ error: "Este chat não possui uma Ordem de Serviço vinculada." });
        return;
      }

      const order = chat.activeOrder;
      const templateConfig = DOCUMENT_TEMPLATES[templateId as DocumentTemplateId];
      if (!templateConfig) {
        res.status(400).json({ error: "Template não configurado." });
        return;
      }

      const firstName = (order.client?.name || chat.name || "Cliente").split(" ")[0];
      const deviceModel = order.device?.model || order.deviceModel || "Equipamento";
      const osNumber = order.osNumber || order.id.slice(0, 8);
      const totalCost = Number(order.totalCost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      const portalLink = `https://sistema.mgvrp.com.br/acompanhar?numero=${osNumber}`;

      let messageText = customMessage || `Olá, ${firstName}! Segue seu documento da OS #${osNumber}.`;
      messageText = messageText
        .replace(/\{cliente_nome\}/g, firstName)
        .replace(/\{aparelho_modelo\}/g, deviceModel)
        .replace(/\{os_numero\}/g, String(osNumber))
        .replace(/\{valor_total\}/g, totalCost)
        .replace(/\{link_portal\}/g, portalLink);

      let pdfBuffer: Buffer | null = null;
      let fileName = `${(templateConfig.nomeArquivo || templateConfig.titulo || "Documento").replace(/\s+/g, "_")}_OS_${osNumber}.pdf`;

      try {
        pdfBuffer = await buildDocumentPdf(templateConfig, order as unknown as PdfOsData);
      } catch (pdfErr: any) {
        console.warn("[WhatsApp Chat] Erro ao gerar PDF do template:", pdfErr.message);
      }

      let mediaUrl = "";
      if (pdfBuffer) {
        try {
          mediaUrl = await saveMediaToFile(pdfBuffer, `doc_${templateId}`, "application/pdf");
        } catch (saveErr: any) {
          console.warn("[WhatsApp Chat] Erro ao salvar PDF localmente:", saveErr.message);
        }
      }

      const senderName = user?.name || "MGV Atendimento";

      const savedMessage = await (prisma as any).whatsappMessage.create({
        data: {
          chatId: chat.id,
          remoteJid: chat.remoteJid,
          fromMe: true,
          senderName,
          messageType: pdfBuffer ? "DOCUMENT" : "TEXT",
          text: messageText,
          mediaUrl: mediaUrl || (pdfBuffer ? `data:application/pdf;base64,${pdfBuffer.toString("base64")}` : null),
          mediaMimeType: pdfBuffer ? "application/pdf" : null,
          fileName: pdfBuffer ? fileName : null,
          status: "PENDING",
          orderId: order.id,
          timestamp: new Date()
        }
      });

      await (prisma as any).whatsappChat.update({
        where: { id: chat.id },
        data: {
          lastMessageText: messageText,
          lastMessageAt: new Date()
        }
      });

      realtimeEvents.broadcast("new_message", {
        chatId: chat.id,
        message: savedMessage
      });

      // 3. Despacha no WhatsApp
      setTimeout(async () => {
        try {
          let result: { success: boolean; keyId?: string; error?: string };
          if (pdfBuffer) {
            result = await sendWhatsAppDocumentMessage(chat.phoneNumber, pdfBuffer, fileName, messageText);
          } else {
            result = await sendWhatsAppTextMessage(chat.phoneNumber, messageText);
          }

          const newKeyId = result.keyId || savedMessage.keyId;
          await (prisma as any).whatsappMessage.update({
            where: { id: savedMessage.id },
            data: {
              keyId: newKeyId,
              status: result.success ? "SENT" : "FAILED",
              errorDetail: result.error || null
            }
          });
          realtimeEvents.broadcast("message_status_update", {
            keyId: newKeyId,
            messageId: savedMessage.id,
            chatId: chat.id,
            status: result.success ? "SENT" : "FAILED"
          });
        } catch (dispatchErr: any) {
          console.error("[WhatsApp Chat] Erro ao despachar template:", dispatchErr);
        }
      }, 50);

      res.status(201).json(savedMessage);
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao enviar template de OS:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // Marcar conversa como lida
  async markRead(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const updated = await (prisma as any).whatsappChat.update({
        where: { id: chatId },
        data: { unreadCount: 0 }
      });
      realtimeEvents.broadcast("chat_read", { chatId });
      res.json({ success: true, chat: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Vincular conversa a uma OS específica
  async linkOrder(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { orderId } = req.body;

      const order = await prisma.ordemServico.findUnique({
        where: { id: orderId },
        include: { client: true }
      });

      if (!order) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      const updated = await (prisma as any).whatsappChat.update({
        where: { id: chatId },
        data: {
          activeOrderId: order.id,
          clientId: order.clientId || undefined
        },
        include: {
          client: true,
          activeOrder: true
        }
      });

      realtimeEvents.broadcast("chat_updated", { chat: updated });
      res.json({ success: true, chat: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Sincronizar histórico da Evolution API / Celular
  async syncFromEvolution(req: Request, res: Response) {
    try {
      const { whatsAppSyncService } = await import("../services/whatsappSync.service");
      const result = await whatsAppSyncService.syncFromEvolution();
      realtimeEvents.broadcast("chats_synced", result);
      res.json(result);
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao sincronizar com Evolution API:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // Sincronizar histórico interno da tabela message_history
  async syncFromInternalHistory(req: Request, res: Response) {
    try {
      const { whatsAppSyncService } = await import("../services/whatsappSync.service");
      const result = await whatsAppSyncService.syncFromInternalHistory();
      realtimeEvents.broadcast("chats_synced", result);
      res.json(result);
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao sincronizar histórico interno:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // Importar histórico de arquivo exportado do WhatsApp (.txt)
  async importChatFile(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { fileContent } = req.body;

      if (!fileContent) {
        res.status(400).json({ error: "Conteúdo do arquivo de texto é obrigatório." });
        return;
      }

      const { whatsAppSyncService } = await import("../services/whatsappSync.service");
      const result = await whatsAppSyncService.parseAndImportTxtChat(chatId, fileContent);
      realtimeEvents.broadcast("chat_messages_imported", { chatId, count: result.imported });
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[WhatsApp Chat] Erro ao importar arquivo de chat:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // Atualizar foto de perfil sob demanda
  async refreshChatAvatar(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const chat = await (prisma as any).whatsappChat.findUnique({ where: { id: chatId } });
      if (!chat) {
        res.status(404).json({ error: "Conversa não encontrada." });
        return;
      }

      let apiUrl = process.env.WHATSAPP_API_URL;
      let apiToken = process.env.WHATSAPP_API_TOKEN;
      let instanceName = process.env.WHATSAPP_INSTANCE_NAME || "mgv_oficial";

      if (apiUrl) apiUrl = apiUrl.replace(/\/+$/, "");

      if (apiUrl && apiToken) {
        const cleanPhone = chat.phoneNumber.replace(/\D/g, "");
        const picRes = await fetch(`${apiUrl}/chat/fetchProfilePictureUrl/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: apiToken },
          body: JSON.stringify({ number: cleanPhone })
        });

        if (picRes.ok) {
          const picData = await picRes.json();
          const profilePicUrl = picData.profilePictureUrl || picData.profilePicUrl;
          if (profilePicUrl) {
            await prisma.$executeRawUnsafe(
              `UPDATE whatsapp_chats SET profile_pic_url = $1 WHERE id = $2`,
              profilePicUrl,
              chatId
            );
            res.json({ success: true, profilePicUrl });
            return;
          }
        }
      }

      res.json({ success: false, message: "Foto não disponível" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const whatsAppChatController = new WhatsAppChatController();
