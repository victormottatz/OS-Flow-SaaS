import prisma from "../database/prisma";
import { formatPhoneNumber } from "./whatsapp";

export class WhatsAppSyncService {
  private async getWhatsAppConfig() {
    let apiUrl = process.env.WHATSAPP_API_URL;
    let apiToken = process.env.WHATSAPP_API_TOKEN;
    let instanceName = process.env.WHATSAPP_INSTANCE_NAME || "mgv_oficial";

    if (!apiUrl) {
      const dbUrl = await prisma.officeSetting.findUnique({ where: { key: "WHATSAPP_API_URL" } });
      apiUrl = dbUrl?.value;
    }
    if (!apiToken) {
      const dbToken = await prisma.officeSetting.findUnique({ where: { key: "WHATSAPP_API_TOKEN" } });
      apiToken = dbToken?.value;
    }
    const dbInstance = await prisma.officeSetting.findUnique({ where: { key: "WHATSAPP_INSTANCE_NAME" } });
    if (dbInstance?.value) instanceName = dbInstance.value;

    if (apiUrl) apiUrl = apiUrl.replace(/\/+$/, "");

    return { apiUrl, apiToken, instanceName };
  }

  // Normaliza e localiza um cliente no banco pelo número do WhatsApp
  private async findClientByPhone(phoneNumber: string) {
    const cleanDigits = phoneNumber.replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 8) return { client: null, order: null };

    // Extrai os últimos 8 dígitos significativos (ignora DDD e 9º dígito se variar)
    const last8 = cleanDigits.slice(-8);

    try {
      const clients = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, phone, "phone2", email, "cpfCnpj" 
         FROM clients 
         WHERE "deletedAt" IS NULL 
           AND (REGEXP_REPLACE(phone, '\\D', '', 'g') LIKE $1 OR REGEXP_REPLACE("phone2", '\\D', '', 'g') LIKE $1)
         LIMIT 1`,
        `%${last8}%`
      );

      if (clients.length > 0) {
        const client = clients[0];
        // Busca a última Ordem de Serviço deste cliente
        const orders = await prisma.ordemServico.findMany({
          where: { clientId: client.id },
          orderBy: { createdAt: "desc" },
          take: 1
        });
        return { client, order: orders.length > 0 ? orders[0] : null };
      }
    } catch (err) {
      console.warn("[WhatsApp Sync] Erro ao buscar cliente por telefone:", err);
    }

    return { client: null, order: null };
  }

  // 1. Sincronização direta com a Evolution API
  async syncFromEvolution(): Promise<{ success: boolean; chatsCount: number; messagesCount: number; error?: string }> {
    const { apiUrl, apiToken, instanceName } = await this.getWhatsAppConfig();

    if (!apiUrl || !apiToken) {
      const internalRes = await this.syncFromInternalHistory();
      return {
        success: true,
        chatsCount: internalRes.chatsCount,
        messagesCount: internalRes.messagesCount,
        error: "Evolution API não configurada; sincronizado histórico interno."
      };
    }

    try {
      // 1.1 Carrega a Agenda de Contatos da Evolution API (1.525 contatos)
      let contactsByJid: Map<string, { pushName?: string; profilePicUrl?: string }> = new Map();
      let contactsByPicId: Map<string, string> = new Map(); // Mapa de ID de foto de perfil -> Nome

      try {
        const contactsRes = await fetch(`${apiUrl}/chat/findContacts/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: apiToken },
          body: JSON.stringify({ where: {} })
        });
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          const rawContacts = Array.isArray(contactsData) ? contactsData : (contactsData.contacts || []);
          for (const c of rawContacts) {
            if (c.remoteJid) {
              contactsByJid.set(c.remoteJid, {
                pushName: c.pushName || undefined,
                profilePicUrl: c.profilePicUrl || undefined
              });

              if (c.profilePicUrl && c.pushName) {
                // Extrai identificador numérico da foto (ex: 675592060 de 675592060_1700754697...)
                const picMatch = c.profilePicUrl.match(/\/(\d+)_/);
                if (picMatch) {
                  contactsByPicId.set(picMatch[1], c.pushName);
                }
              }
            }
          }
          console.log(`[WhatsApp Sync] Agenda carregada: ${contactsByJid.size} contatos mapeados.`);
        }
      } catch (cErr) {
        console.warn("[WhatsApp Sync] Aviso ao carregar agenda de contatos:", cErr);
      }

      // 1.2 Busca todos os chats na Evolution API
      const chatsRes = await fetch(`${apiUrl}/chat/findChats/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiToken
        },
        body: JSON.stringify({ where: {} })
      });

      if (!chatsRes.ok) {
        throw new Error(`Falha ao obter chats da Evolution API: ${chatsRes.statusText}`);
      }

      const chatsData = await chatsRes.json();
      const rawChats = Array.isArray(chatsData) ? chatsData : (chatsData.chats || []);

      let syncedChats = 0;
      let syncedMessages = 0;

      for (const item of rawChats) {
        const remoteJid = item.remoteJid;
        
        // Ignora grupos de WhatsApp e Stories
        if (!remoteJid || remoteJid.includes("@g.us") || remoteJid === "status@broadcast" || remoteJid.startsWith("0@")) {
          continue;
        }

        const isLid = remoteJid.endsWith("@lid");
        const cleanDigits = remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
        
        // Encontra o contato na agenda mapeada por JID
        const contactInfo = contactsByJid.get(remoteJid);
        let contactName = item.pushName || item.name || contactInfo?.pushName || null;
        let profilePicUrl = item.profilePicUrl || contactInfo?.profilePicUrl || null;

        // Busca foto de perfil dedicada se ainda não tiver
        if (!profilePicUrl) {
          try {
            const picRes = await fetch(`${apiUrl}/chat/fetchProfilePictureUrl/${instanceName}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: apiToken },
              body: JSON.stringify({ number: remoteJid })
            });
            if (picRes.ok) {
              const picData = await picRes.json();
              profilePicUrl = picData.profilePictureUrl || picData.profilePicUrl || null;
            }
          } catch (_) {}
        }

        // Se encontrou a foto de perfil mas não tinha nome, cruza pela assinatura da foto
        if ((!contactName || /^\d+$/.test(contactName)) && profilePicUrl) {
          const picMatch = profilePicUrl.match(/\/(\d+)_/);
          if (picMatch && contactsByPicId.has(picMatch[1])) {
            contactName = contactsByPicId.get(picMatch[1]) || contactName;
          }
        }

        // Localiza cliente no cadastro do sistema por número normalizado
        let matchedClient = null;
        let matchedOrder = null;
        if (!isLid && cleanDigits.length >= 10 && cleanDigits.length <= 13) {
          const matchResult = await this.findClientByPhone(cleanDigits);
          matchedClient = matchResult.client;
          matchedOrder = matchResult.order;
        }

        // Determina o nome de exibição mais amigável e legível
        let displayName: string;
        if (matchedClient) {
          displayName = matchedClient.name;
        } else if (contactName && !/^\d+$/.test(contactName)) {
          displayName = contactName;
        } else if (!isLid && cleanDigits.length >= 10 && cleanDigits.length <= 13) {
          displayName = formatPhoneNumber(cleanDigits);
        } else {
          displayName = "Contato WhatsApp";
        }

        let lastText = item.lastMessage?.message?.conversation ||
                       item.lastMessage?.message?.extendedTextMessage?.text ||
                       item.lastMessage?.message?.documentMessage?.caption ||
                       "Conversa iniciada";

        // Upsert do Chat
        const chat = await (prisma as any).whatsappChat.upsert({
          where: { remoteJid },
          create: {
            remoteJid,
            name: displayName,
            phoneNumber: isLid ? "" : cleanDigits,
            clientId: matchedClient?.id || null,
            activeOrderId: matchedOrder?.id || null,
            lastMessageText: lastText,
            lastMessageAt: new Date(item.updatedAt || Date.now()),
            unreadCount: item.unreadCount || 0
          },
          update: {
            name: displayName,
            phoneNumber: isLid ? "" : cleanDigits,
            clientId: matchedClient?.id || undefined,
            activeOrderId: matchedOrder?.id || undefined,
            lastMessageText: lastText,
            lastMessageAt: new Date(item.updatedAt || Date.now())
          }
        });

        // Atualiza a foto de perfil via SQL se encontrada
        if (profilePicUrl) {
          try {
            await prisma.$executeRawUnsafe(
              `UPDATE whatsapp_chats SET profile_pic_url = $1 WHERE id = $2`,
              profilePicUrl,
              chat.id
            );
          } catch (_) {}
        }

        syncedChats++;

        // 1.3 Busca as mensagens históricas deste contato
        try {
          const msgsRes = await fetch(`${apiUrl}/chat/findMessages/${instanceName}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: apiToken
            },
            body: JSON.stringify({
              where: {
                key: { remoteJid }
              },
              limit: 100
            })
          });

          if (msgsRes.ok) {
            const msgsData = await msgsRes.json();
            const rawMessages = Array.isArray(msgsData)
              ? msgsData
              : (msgsData.messages?.records || msgsData.messages || msgsData.records || []);

            for (const msgItem of rawMessages) {
              const key = msgItem.key || {};
              const keyId = key.id;
              if (!keyId) continue;

              const fromMe = Boolean(key.fromMe);
              const message = msgItem.message || {};
              let text = "";
              let messageType: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "VIDEO" | "STICKER" | "OTHER" = "TEXT";
              let fileName: string | null = null;
              let mediaUrl: string | null = null;
              let mediaMimeType: string | null = null;

              if (message.conversation) {
                text = message.conversation;
                messageType = "TEXT";
              } else if (message.extendedTextMessage?.text) {
                text = message.extendedTextMessage.text;
                messageType = "TEXT";
              } else if (message.imageMessage) {
                text = message.imageMessage.caption || "📷 Imagem recebida";
                messageType = "IMAGE";
                mediaUrl = message.imageMessage.url;
                mediaMimeType = message.imageMessage.mimetype || "image/jpeg";
              } else if (message.stickerMessage) {
                text = "🏷️ Figurinha";
                messageType = "STICKER";
                mediaUrl = message.stickerMessage.url;
                mediaMimeType = message.stickerMessage.mimetype || "image/webp";
              } else if (message.audioMessage) {
                text = "🎵 Mensagem de Áudio";
                messageType = "AUDIO";
                mediaUrl = message.audioMessage.url;
                mediaMimeType = message.audioMessage.mimetype || "audio/ogg";
              } else if (message.documentMessage) {
                text = message.documentMessage.caption || message.documentMessage.fileName || "📄 Documento PDF";
                messageType = "DOCUMENT";
                fileName = message.documentMessage.fileName || "Documento.pdf";
                mediaUrl = message.documentMessage.url;
                mediaMimeType = message.documentMessage.mimetype || "application/pdf";
              } else if (message.videoMessage) {
                text = message.videoMessage.caption || "🎥 Vídeo recebido";
                messageType = "VIDEO";
                mediaUrl = message.videoMessage.url;
                mediaMimeType = message.videoMessage.mimetype || "video/mp4";
              }

              if (!text && !messageType) continue;

              const rawTimestamp = msgItem.messageTimestamp;
              const msgDate = rawTimestamp
                ? new Date(typeof rawTimestamp === "number" ? rawTimestamp * 1000 : rawTimestamp)
                : new Date();

              const rawStatus = msgItem.status;
              let itemStatus: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" = fromMe ? "SENT" : "READ";
              if (fromMe && rawStatus !== undefined && rawStatus !== null) {
                const s = String(rawStatus).toUpperCase();
                if (s === "READ" || s === "4" || s === "PLAYED" || s === "5" || s === "VIEWED") itemStatus = "READ";
                else if (s === "DELIVERY_ACK" || s === "3" || s === "DELIVERED" || s === "RECEIVED") itemStatus = "DELIVERED";
                else if (s === "SERVER_ACK" || s === "2" || s === "SENT" || s === "SEND") itemStatus = "SENT";
                else if (s === "PENDING" || s === "1") itemStatus = "PENDING";
                else if (s === "ERROR" || s === "FAILED" || s === "0") itemStatus = "FAILED";
              }

              await (prisma as any).whatsappMessage.upsert({
                where: { keyId },
                create: {
                  chatId: chat.id,
                  remoteJid,
                  keyId,
                  fromMe,
                  senderName: fromMe ? "MGV Atendimento" : displayName,
                  messageType,
                  text,
                  fileName,
                  mediaUrl,
                  mediaMimeType,
                  status: itemStatus,
                  timestamp: isNaN(msgDate.getTime()) ? new Date() : msgDate,
                  orderId: matchedOrder?.id || null
                },
                update: {
                  chatId: chat.id,
                  text,
                  status: itemStatus
                }
              });

              syncedMessages++;
            }
          }
        } catch (msgErr) {
          console.warn(`[WhatsApp Sync] Erro ao sincronizar mensagens do chat ${remoteJid}:`, msgErr);
        }
      }

      // Sincroniza também o histórico interno prévio do banco
      await this.syncFromInternalHistory();

      return { success: true, chatsCount: syncedChats, messagesCount: syncedMessages };
    } catch (err: any) {
      console.error("[WhatsApp Sync] Erro na sincronização com Evolution API:", err);
      const internalRes = await this.syncFromInternalHistory();
      return {
        success: true,
        chatsCount: internalRes.chatsCount,
        messagesCount: internalRes.messagesCount,
        error: err.message
      };
    }
  }

  // 2. Migração do Histórico Interno do MGV (tabela message_history)
  async syncFromInternalHistory(): Promise<{ chatsCount: number; messagesCount: number }> {
    try {
      const histories = await prisma.messageHistory.findMany({
        include: {
          order: {
            include: { client: true }
          }
        },
        orderBy: { createdAt: "asc" }
      });

      let chatsMap: Map<string, any> = new Map();
      let importedMessages = 0;

      for (const item of histories) {
        const cleanPhone = item.phoneNumber.replace(/\D/g, "");
        if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 13) continue;

        const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
        const remoteJid = `${formattedPhone}@s.whatsapp.net`;
        const clientName = item.order?.client?.name || "Cliente";

        // Cria ou obtém o Chat
        let chat = chatsMap.get(remoteJid);
        if (!chat) {
          chat = await (prisma as any).whatsappChat.upsert({
            where: { remoteJid },
            create: {
              remoteJid,
              name: clientName,
              phoneNumber: formattedPhone,
              clientId: item.order?.clientId || null,
              activeOrderId: item.orderId,
              lastMessageText: item.messageText,
              lastMessageAt: item.createdAt,
              unreadCount: 0
            },
            update: {
              name: clientName,
              lastMessageText: item.messageText,
              lastMessageAt: item.createdAt,
              activeOrderId: item.orderId || undefined,
              clientId: item.order?.clientId || undefined
            }
          });
          chatsMap.set(remoteJid, chat);
        }

        const keyId = `internal_${item.id}`;

        await (prisma as any).whatsappMessage.upsert({
          where: { keyId },
          create: {
            chatId: chat.id,
            remoteJid,
            keyId,
            fromMe: true,
            senderName: "MGV Atendimento (Histórico)",
            messageType: "TEXT",
            text: item.messageText,
            status: item.status === "FALHOU" ? "FAILED" : "SENT",
            errorDetail: item.errorDetail,
            timestamp: item.createdAt,
            orderId: item.orderId
          },
          update: {
            chatId: chat.id
          }
        });

        importedMessages++;
      }

      return { chatsCount: chatsMap.size, messagesCount: importedMessages };
    } catch (err) {
      console.error("[WhatsApp Sync] Erro ao sincronizar histórico interno:", err);
      return { chatsCount: 0, messagesCount: 0 };
    }
  }

  // 3. Parser e Importador de Arquivo Exportado do WhatsApp (.txt)
  async parseAndImportTxtChat(chatId: string, fileContent: string): Promise<{ imported: number }> {
    const chat = await (prisma as any).whatsappChat.findUnique({
      where: { id: chatId },
      include: { client: true, activeOrder: true }
    });

    if (!chat) throw new Error("Conversa não encontrada.");

    const lines = fileContent.split(/\r?\n/);
    let imported = 0;

    const lineRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*(?:AM|PM|am|pm))?\]?\s*[-:]?\s*([^:]+):\s*(.+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const match = line.match(lineRegex);
      if (match) {
        const [_, datePart, timePart, senderRaw, textRaw] = match;
        const sender = senderRaw.trim();
        const text = textRaw.trim();

        const isFromMe = sender.toLowerCase().includes("mgv") || sender.toLowerCase().includes("suporte") || sender.toLowerCase().includes("atendimento");

        const [day, month, yearRaw] = datePart.split("/");
        const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
        const timeParts = timePart.split(":");
        const hours = timeParts[0];
        const minutes = timeParts[1];
        const seconds = timeParts[2] || "00";

        const timestamp = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
        const keyId = `imported_${chatId}_${timestamp.getTime()}_${i}`;

        await (prisma as any).whatsappMessage.upsert({
          where: { keyId },
          create: {
            chatId: chat.id,
            remoteJid: chat.remoteJid,
            keyId,
            fromMe: isFromMe,
            senderName: isFromMe ? "MGV Atendimento" : (chat.client?.name || sender),
            messageType: "TEXT",
            text,
            status: "READ",
            timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
            orderId: chat.activeOrderId || null
          },
          update: {}
        });

        imported++;
      }
    }

    return { imported };
  }

  // 4. Sincronização Leve e Incremental em Background (Polling Contínuo de Tempo Real)
  private isAutoSyncing = false;

  async quickSyncRecentEvolution(): Promise<number> {
    if (this.isAutoSyncing) return 0;
    this.isAutoSyncing = true;

    try {
      const { apiUrl, apiToken, instanceName } = await this.getWhatsAppConfig();
      if (!apiUrl || !apiToken) return 0;

      // 4.1 Busca chats recentes na Evolution API
      const chatsRes = await fetch(`${apiUrl}/chat/findChats/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiToken },
        body: JSON.stringify({ where: {} })
      });

      if (!chatsRes.ok) return 0;
      const chatsData = await chatsRes.json();
      const rawChats = Array.isArray(chatsData) ? chatsData : (chatsData.chats || []);
      if (!Array.isArray(rawChats) || rawChats.length === 0) return 0;

      // Ordena os chats pelo horário da última mensagem (updatedAt) de forma decrescente
      const sortedChats = [...rawChats].sort((a, b) => {
        const timeA = new Date(a.updatedAt || (a.lastMessage?.messageTimestamp ? a.lastMessage.messageTimestamp * 1000 : 0)).getTime();
        const timeB = new Date(b.updatedAt || (b.lastMessage?.messageTimestamp ? b.lastMessage.messageTimestamp * 1000 : 0)).getTime();
        return timeB - timeA;
      });

      // Filtra grupos e pega os 15 chats mais recentes ativos
      const candidateChats = sortedChats
        .filter(c => c.remoteJid && !c.remoteJid.includes("@g.us") && c.remoteJid !== "status@broadcast" && !c.remoteJid.startsWith("0@"))
        .slice(0, 15);

      let totalNewMessages = 0;

      for (const item of candidateChats) {
        const remoteJid = item.remoteJid;
        const remoteJidAlt = item.lastMessage?.key?.remoteJidAlt;
        const phoneCandidate = (remoteJidAlt || remoteJid).replace(/@.*$/, "").replace(/\D/g, "");
        const isLid = remoteJid.endsWith("@lid");

        // Busca as 10 últimas mensagens desse chat
        try {
          const msgsRes = await fetch(`${apiUrl}/chat/findMessages/${instanceName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: apiToken },
            body: JSON.stringify({
              where: { key: { remoteJid } },
              limit: 10
            })
          });

          if (!msgsRes.ok) continue;
          const msgsData = await msgsRes.json();
          const rawMessages = Array.isArray(msgsData)
            ? msgsData
            : (msgsData.messages?.records || msgsData.messages || msgsData.records || []);

          if (!Array.isArray(rawMessages) || rawMessages.length === 0) continue;

          for (const msgItem of rawMessages) {
            const key = msgItem.key || {};
            const keyId = key.id;
            if (!keyId) continue;

            // Verifica se a mensagem já existe no banco
            const existingMsg = await (prisma as any).whatsappMessage.findFirst({
              where: {
                OR: [
                  { keyId },
                  { id: keyId }
                ]
              }
            });

            if (existingMsg) continue; // Mensagem já cadastrada, pula

            // Mensagem NOVA encontrada!
            const fromMe = Boolean(key.fromMe);
            const message = msgItem.message || {};
            let text = "";
            let messageType: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "VIDEO" | "STICKER" | "OTHER" = "TEXT";
            let fileName: string | null = null;
            let mediaUrl: string | null = null;
            let mediaMimeType: string | null = null;

            if (message.conversation) {
              text = message.conversation;
              messageType = "TEXT";
            } else if (message.extendedTextMessage?.text) {
              text = message.extendedTextMessage.text;
              messageType = "TEXT";
            } else if (message.imageMessage) {
              text = message.imageMessage.caption || "📷 Imagem";
              messageType = "IMAGE";
              mediaUrl = message.imageMessage.url;
              mediaMimeType = message.imageMessage.mimetype || "image/jpeg";
            } else if (message.stickerMessage) {
              text = "🏷️ Figurinha";
              messageType = "STICKER";
              mediaUrl = message.stickerMessage.url;
              mediaMimeType = message.stickerMessage.mimetype || "image/webp";
            } else if (message.audioMessage) {
              text = "🎵 Áudio";
              messageType = "AUDIO";
              mediaUrl = message.audioMessage.url;
              mediaMimeType = message.audioMessage.mimetype || "audio/ogg";
            } else if (message.documentMessage) {
              text = message.documentMessage.caption || message.documentMessage.fileName || "📄 Documento";
              messageType = "DOCUMENT";
              fileName = message.documentMessage.fileName || "Documento.pdf";
              mediaUrl = message.documentMessage.url;
              mediaMimeType = message.documentMessage.mimetype || "application/pdf";
            } else if (message.videoMessage) {
              text = message.videoMessage.caption || "🎥 Vídeo";
              messageType = "VIDEO";
              mediaUrl = message.videoMessage.url;
              mediaMimeType = message.videoMessage.mimetype || "video/mp4";
            }

            if (!text && !messageType) continue;

            const rawTimestamp = msgItem.messageTimestamp;
            const msgDate = rawTimestamp
              ? new Date(typeof rawTimestamp === "number" ? rawTimestamp * 1000 : rawTimestamp)
              : new Date();

            // Localiza ou cria o chat no banco
            let chat = await (prisma as any).whatsappChat.findFirst({
              where: {
                OR: [
                  { remoteJid },
                  ...(remoteJidAlt ? [{ remoteJid: remoteJidAlt }] : []),
                  ...(phoneCandidate.length >= 8 ? [{ phoneNumber: { contains: phoneCandidate.slice(-8) } }] : [])
                ]
              },
              include: {
                client: { select: { id: true, name: true, phone: true, email: true, cpfCnpj: true } },
                activeOrder: { select: { id: true, osNumber: true, status: true, totalCost: true } }
              }
            });

            if (!chat) {
              let matchedClient = null;
              let matchedOrder = null;
              if (phoneCandidate.length >= 8) {
                const matchRes = await this.findClientByPhone(phoneCandidate);
                matchedClient = matchRes.client;
                matchedOrder = matchRes.order;
              }

              const pushName = msgItem.pushName || item.pushName || item.name || (matchedClient ? matchedClient.name : (fromMe ? "MGV Suporte" : "Cliente"));
              chat = await (prisma as any).whatsappChat.create({
                data: {
                  remoteJid,
                  name: matchedClient ? matchedClient.name : pushName,
                  phoneNumber: phoneCandidate,
                  profilePicUrl: item.profilePicUrl || null,
                  clientId: matchedClient?.id || null,
                  activeOrderId: matchedOrder?.id || null,
                  lastMessageText: text || `[${messageType}]`,
                  lastMessageAt: msgDate,
                  unreadCount: fromMe ? 0 : 1
                },
                include: {
                  client: { select: { id: true, name: true, phone: true, email: true, cpfCnpj: true } },
                  activeOrder: { select: { id: true, osNumber: true, status: true, totalCost: true } }
                }
              });
            } else {
              chat = await (prisma as any).whatsappChat.update({
                where: { id: chat.id },
                data: {
                  lastMessageText: text || `[${messageType}]`,
                  lastMessageAt: msgDate,
                  unreadCount: fromMe ? chat.unreadCount : { increment: 1 }
                },
                include: {
                  client: { select: { id: true, name: true, phone: true, email: true, cpfCnpj: true } },
                  activeOrder: { select: { id: true, osNumber: true, status: true, totalCost: true } }
                }
              });
            }

            // Salva a nova mensagem
            const savedMessage = await (prisma as any).whatsappMessage.create({
              data: {
                chatId: chat.id,
                remoteJid,
                keyId,
                fromMe,
                senderName: fromMe ? "MGV Suporte" : (chat.client?.name || chat.name || "Cliente"),
                messageType,
                text,
                fileName,
                mediaUrl,
                mediaMimeType,
                status: fromMe ? "SENT" : "READ",
                timestamp: isNaN(msgDate.getTime()) ? new Date() : msgDate,
                orderId: chat.activeOrderId || null
              }
            });

            totalNewMessages++;
            console.log(`[WhatsApp AutoSync] 📩 Nova mensagem recebida de ${remoteJid}: "${(text || "").slice(0, 35)}..."`);

            // Notifica o frontend via SSE imediatamente
            const { realtimeEvents } = await import("./realtimeEvents");
            realtimeEvents.broadcast("new_message", {
              chatId: chat.id,
              message: savedMessage,
              chat
            });
            realtimeEvents.broadcast("chat_updated", { chat });
          }
        } catch (chatErr) {}
      }

      return totalNewMessages;
    } catch (err: any) {
      return 0;
    } finally {
      this.isAutoSyncing = false;
    }
  }

  // Inicia a rotina de auto-sync em background contínuo
  startAutoSyncRoutine(intervalMs = 4000) {
    // Executa a primeira checagem após 2 segundos do boot
    setTimeout(() => {
      this.quickSyncRecentEvolution().catch(() => {});
    }, 2000);

    // Mantém o ciclo a cada 4 segundos
    setInterval(() => {
      this.quickSyncRecentEvolution().catch(() => {});
    }, intervalMs);

    console.log(`[WhatsApp AutoSync] ⚡ Rotina de sincronização contínua ativada (polling a cada ${intervalMs / 1000}s).`);
  }
}

export const whatsAppSyncService = new WhatsAppSyncService();

