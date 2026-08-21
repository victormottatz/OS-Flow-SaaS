import { Request, Response } from "express";
import prisma from "../database/prisma";
import { realtimeEvents } from "../services/realtimeEvents";
import { sendWhatsAppTextMessage, sendWhatsAppDocumentMessage, formatPhoneNumber } from "../services/whatsapp";
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
          await (prisma as any).whatsappMessage.update({
            where: { id: savedMessage.id },
            data: {
              status: result.success ? "SENT" : "FAILED",
              errorDetail: result.error || null
            }
          });
          realtimeEvents.broadcast("message_status_update", {
            keyId: savedMessage.id,
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

  // Envia documento oficial de OS (Orçamento, Laudo, etc) gerando PDF automaticamente
  async sendTemplateOs(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { orderId, templateId, messageText, includePdf = true } = req.body;
      const user = (req as any).user;

      const chat = await (prisma as any).whatsappChat.findUnique({
        where: { id: chatId }
      });

      if (!chat) {
        res.status(404).json({ error: "Conversa não encontrada." });
        return;
      }

      const os = await prisma.ordemServico.findUnique({
        where: { id: orderId || chat.activeOrderId },
        include: { client: true, device: true }
      });

      if (!os) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      const senderName = user?.name || "MGV Atendimento";

      // 1. Gera PDF se solicitado
      let pdfBuffer: Buffer | null = null;
      let fileName = `OS-${os.osNumber}.pdf`;

      if (includePdf && templateId && DOCUMENT_TEMPLATES[templateId as DocumentTemplateId]) {
        try {
          const docTemplate = DOCUMENT_TEMPLATES[templateId as DocumentTemplateId];
          pdfBuffer = await buildDocumentPdf(docTemplate, os as unknown as PdfOsData);
          fileName = `${docTemplate.nomeArquivo}-${os.osNumber}.pdf`;
        } catch (pdfErr: any) {
          console.warn(`[WhatsApp Chat] Erro ao gerar PDF de template: ${pdfErr.message}`);
        }
      }

      // 2. Salva a mensagem no banco
      const savedMessage = await (prisma as any).whatsappMessage.create({
        data: {
          chatId: chat.id,
          remoteJid: chat.remoteJid,
          fromMe: true,
          senderName,
          messageType: pdfBuffer ? "DOCUMENT" : "TEXT",
          text: messageText,
          fileName: pdfBuffer ? fileName : null,
          status: "PENDING",
          orderId: os.id,
          timestamp: new Date()
        }
      });

      await (prisma as any).whatsappChat.update({
        where: { id: chat.id },
        data: {
          lastMessageText: messageText || `📄 ${fileName}`,
          lastMessageAt: new Date(),
          activeOrderId: os.id,
          clientId: chat.clientId || os.clientId
        }
      });

      realtimeEvents.broadcast("new_message", {
        chatId: chat.id,
        message: savedMessage
      });

      // 3. Despacha no WhatsApp
      setTimeout(async () => {
        try {
          let result: { success: boolean; error?: string };
          if (pdfBuffer) {
            result = await sendWhatsAppDocumentMessage(chat.phoneNumber, pdfBuffer, fileName, messageText);
          } else {
            result = await sendWhatsAppTextMessage(chat.phoneNumber, messageText);
          }

          await (prisma as any).whatsappMessage.update({
            where: { id: savedMessage.id },
            data: {
              status: result.success ? "SENT" : "FAILED",
              errorDetail: result.error || null
            }
          });

          realtimeEvents.broadcast("message_status_update", {
            keyId: savedMessage.id,
            status: result.success ? "SENT" : "FAILED"
          });
        } catch (dispatchErr: any) {
          console.error("[WhatsApp Chat] Erro ao despachar template de OS:", dispatchErr);
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
