import prisma from "../database/prisma";
import { featureFlags } from "./FeatureFlagService";
import { buildDocumentPdf, PdfOsData } from "./pdfService";
import { DOCUMENT_TEMPLATES, DocumentTemplateId } from "../config/documents.config";
import { realtimeEvents } from "./realtimeEvents";

const WHATSAPP_TEMPLATES: Record<string, string> = {
  AGUARDANDO_AVALIACAO: 
    "🩺 *Olá, {cliente_nome}! Tudo bem?*\n\n" +
    "Confirmamos a entrada do seu equipamento *{aparelho_marca} {aparelho_modelo}* em nosso laboratório técnico sob a *OS #{os_numero}*.\n\n" +
    "📎 *Segue em anexo o seu Termo de Recebimento com o checklist de entrada.*\n\n" +
    "Nossa equipe especializada já iniciou a triagem e em breve enviaremos o laudo com o diagnóstico completo.\n\n" +
    "💬 _Se precisar de qualquer informação, basta responder esta mensagem!_",

  AGUARDANDO_AUTORIZACAO: 
    "📋 *Olá, {cliente_nome}!*\n\n" +
    "A avaliação técnica do seu *{aparelho_modelo}* (OS *#{os_numero}*) foi finalizada com sucesso!\n\n" +
    "💰 *Valor Total:* *R$ {valor_total}*\n" +
    "📎 *Segue em anexo o Orçamento Oficial detalhado com o laudo pericial das peças.*\n\n" +
    "✨ *Aprovação Online com 1 Clique:*\n" +
    "Para visualizar os detalhes e aprovar seu orçamento com segurança, acesse:\n" +
    "🔗 {link_portal}\n\n" +
    "💬 _Qualquer dúvida sobre o laudo, basta responder aqui para falar com o responsável técnico!_",

  AGUARDANDO_PECA: 
    "📦 *Olá, {cliente_nome}! Atualização sobre sua OS #{os_numero}:*\n\n" +
    "Para garantir a máxima qualidade e durabilidade no conserto do seu *{aparelho_modelo}*, solicitamos componentes novos e de procedência garantida.\n\n" +
    "Assim que as peças chegarem em nossa bancada técnica, daremos prioridade imediata à montagem e aos testes. Manteremos você informado! ⚙️",

  EM_MANUTENCAO: 
    "⚙️ *Olá, {cliente_nome}!*\n\n" +
    "Informamos que a manutenção do seu equipamento *{aparelho_modelo}* (OS *#{os_numero}*) já foi iniciada na bancada técnica por nossos especialistas.\n\n" +
    "Em breve seu aparelho passará pelos testes finais de qualidade! 🔬",

  PRONTO_RETIRADA: 
    "🎉 *Ótima notícia, {cliente_nome}!* \n\n" +
    "O seu equipamento *{aparelho_modelo}* (OS *#{os_numero}*) concluiu com sucesso todas as etapas de serviços técnicos e testes de qualidade!\n\n" +
    "📍 *Seu aparelho já está disponível para retirada na MGV:*\n" +
    "🏢 *Endereço:* Rua Julio Prestes, 648 - Jardim Sumaré, Ribeirão Preto - SP\n" +
    "⏰ *Horário de Atendimento:* Segunda a Quinta das 08h às 18h | Sexta das 08h às 17h (Sábado e Domingo: Fechado)\n\n" +
    "📎 *Segue em anexo o Laudo Técnico / Recibo do atendimento.*\n\n" +
    "💬 _Aguardamos sua visita! Caso prefira agilizar o faturamento via PIX antes da retirada, basta solicitar a chave por esta conversa._",

  FINALIZADO: 
    "🤝 *Equipamento Entregue com Sucesso!*\n\n" +
    "Olá, *{cliente_nome}*! A Ordem de Serviço *#{os_numero}* do seu *{aparelho_modelo}* foi concluída e o equipamento entregue.\n\n" +
    "📎 *Segue em anexo o seu Recibo Oficial de Entrega com o Termo de Garantia de 90 dias.*\n\n" +
    "Agradecemos imensamente a confiança na MGV Assistência Técnica! Sempre que precisar de suporte técnico ou novas manutenções, estamos à sua disposição. ✨",

  ORCAMENTO_RECUSADO: 
    "Olá, *{cliente_nome}*!\n\n" +
    "Confirmamos o encerramento da proposta de orçamento para a OS *#{os_numero}* (*{aparelho_modelo}*).\n\n" +
    "Seu equipamento foi remontado com segurança e já está disponível para retirada na oficina.\n\n" +
    "📎 *Segue em anexo o Termo de Devolução Sem Reparo.*\n\n" +
    "Agradecemos a consulta e permanecemos à sua inteira disposição!",

  DESCARTE: 
    "Olá, *{cliente_nome}*!\n\n" +
    "Informamos que, conforme combinado e autorizado, o equipamento da OS *#{os_numero}* foi destinado ao descarte técnico e reciclagem ambientalmente adequada.\n\n" +
    "📎 *Segue em anexo o Certificado de Descarte e Baixa Técnica.*\n\n" +
    "Obrigado pela confiança!"
};

function formatWhatsAppMessage(template: string, data: {
  cliente_nome: string;
  os_numero: string;
  aparelho_modelo: string;
  aparelho_marca: string;
  valor_total: string;
  link_portal: string;
}): string {
  let msg = template;
  msg = msg.replace(/{cliente_nome}/g, data.cliente_nome);
  msg = msg.replace(/{os_numero}/g, data.os_numero);
  msg = msg.replace(/{aparelho_modelo}/g, data.aparelho_modelo);
  msg = msg.replace(/{aparelho_marca}/g, data.aparelho_marca);
  msg = msg.replace(/{valor_total}/g, data.valor_total);
  msg = msg.replace(/{link_portal}/g, data.link_portal);
  return msg;
}

export function formatPhoneNumber(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Verifica se o momento atual está dentro do horário comercial permitido para disparos.
 * Segunda a Quinta: 08h às 18h | Sexta: 08h às 17h | Sábados e Domingos: Fechado
 */
export function isWithinBusinessHours(): boolean {
  const now = new Date();
  const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const day = spTime.getDay(); // 0 = Domingo, 1 a 4 = Seg a Qui, 5 = Sex, 6 = Sábado
  const hour = spTime.getHours();

  // Sábado e Domingo: Fechado
  if (day === 0 || day === 6) return false;
  // Sexta-feira: 08:00 às 17:00
  if (day === 5) return hour >= 8 && hour < 17;
  // Segunda a Quinta: 08:00 às 18:00
  return hour >= 8 && hour < 18;
}

export async function getWhatsAppConfig() {
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

/**
 * Envia mensagem de texto simples pela Evolution API
 */
export async function sendWhatsAppTextMessage(
  phoneNumber: string,
  messageText: string
): Promise<{ success: boolean; error?: string; keyId?: string }> {
  const { apiUrl, apiToken, instanceName } = await getWhatsAppConfig();

  if (!apiUrl || !apiToken) {
    const errMsg = "Evolution API não configurada no servidor (WHATSAPP_API_URL ou WHATSAPP_API_TOKEN vazios).";
    console.error(`[WhatsApp Service] Erro: ${errMsg}`);
    return { success: false, error: errMsg };
  }

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiToken
      },
      body: JSON.stringify({
        number: formatPhoneNumber(phoneNumber),
        text: messageText
      })
    });

    if (response.ok) {
      let keyId: string | undefined;
      try {
        const json = await response.json();
        keyId = json.key?.id || json.id || json.messageId;
      } catch (_) {}
      return { success: true, keyId };
    } else {
      const errText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
  }
}

/**
 * Envia documento PDF pela Evolution API com legenda (caption)
 */
export async function sendWhatsAppDocumentMessage(
  phoneNumber: string,
  pdfBuffer: Buffer,
  fileName: string,
  captionText: string
): Promise<{ success: boolean; keyId?: string; error?: string }> {
  return sendWhatsAppGenericDocumentMessage(phoneNumber, pdfBuffer, fileName, "application/pdf", captionText);
}

/**
 * Envia documento genérico (PDF, DOCX, XLSX, TXT, etc.) pela Evolution API
 */
export async function sendWhatsAppGenericDocumentMessage(
  phoneNumber: string,
  fileData: Buffer | string,
  fileName: string,
  mimetype: string = "application/pdf",
  captionText?: string
): Promise<{ success: boolean; keyId?: string; error?: string }> {
  const { apiUrl, apiToken, instanceName } = await getWhatsAppConfig();

  if (!apiUrl || !apiToken) {
    const errMsg = "Evolution API não configurada no servidor (WHATSAPP_API_URL ou WHATSAPP_API_TOKEN vazios).";
    console.error(`[WhatsApp Service] Erro: ${errMsg}`);
    return { success: false, error: errMsg };
  }

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const base64Data = typeof fileData === "string" 
      ? fileData.replace(/^data:[^;]+;base64,/, "") 
      : fileData.toString("base64");

    const response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiToken
      },
      body: JSON.stringify({
        number: formatPhoneNumber(phoneNumber),
        mediatype: "document",
        mimetype: mimetype,
        caption: captionText || "",
        fileName: fileName,
        media: base64Data
      })
    });

    if (response.ok) {
      let keyId: string | undefined;
      try {
        const json = await response.json();
        keyId = json.key?.id || json.id || json.messageId;
      } catch (_) {}
      return { success: true, keyId };
    } else {
      const errText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
  }
}

/**
 * Envia imagem pela Evolution API com legenda opcional
 */
export async function sendWhatsAppImageMessage(
  phoneNumber: string,
  imageData: Buffer | string,
  fileName: string = "imagem.jpg",
  captionText?: string,
  mimetype: string = "image/jpeg"
): Promise<{ success: boolean; keyId?: string; error?: string }> {
  const { apiUrl, apiToken, instanceName } = await getWhatsAppConfig();

  if (!apiUrl || !apiToken) {
    const errMsg = "Evolution API não configurada no servidor (WHATSAPP_API_URL ou WHATSAPP_API_TOKEN vazios).";
    console.error(`[WhatsApp Service] Erro: ${errMsg}`);
    return { success: false, error: errMsg };
  }

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const base64Data = typeof imageData === "string" 
      ? imageData.replace(/^data:[^;]+;base64,/, "") 
      : imageData.toString("base64");

    const response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiToken
      },
      body: JSON.stringify({
        number: formatPhoneNumber(phoneNumber),
        mediatype: "image",
        mimetype: mimetype,
        caption: captionText || "",
        fileName: fileName,
        media: base64Data
      })
    });

    if (response.ok) {
      let keyId: string | undefined;
      try {
        const json = await response.json();
        keyId = json.key?.id || json.id || json.messageId;
      } catch (_) {}
      return { success: true, keyId };
    } else {
      const errText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
  }
}

/**
 * Envia mensagem de áudio (gravação de voz / PTT) pela Evolution API
 */
export async function sendWhatsAppAudioMessage(
  phoneNumber: string,
  audioData: Buffer | string,
  ptt: boolean = true
): Promise<{ success: boolean; keyId?: string; error?: string }> {
  const { apiUrl, apiToken, instanceName } = await getWhatsAppConfig();

  if (!apiUrl || !apiToken) {
    const errMsg = "Evolution API não configurada no servidor (WHATSAPP_API_URL ou WHATSAPP_API_TOKEN vazios).";
    console.error(`[WhatsApp Service] Erro: ${errMsg}`);
    return { success: false, error: errMsg };
  }

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const base64Data = typeof audioData === "string"
      ? audioData.replace(/^data:[^;]+;base64,/, "")
      : audioData.toString("base64");

    // Tenta primeiro o endpoint dedicado de WhatsApp Audio (PTT)
    let response = await fetch(`${apiUrl}/message/sendWhatsAppAudio/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiToken
      },
      body: JSON.stringify({
        number: formatPhoneNumber(phoneNumber),
        audio: base64Data
      })
    });

    // Se o endpoint específico não existir, usa o sendMedia padrão
    if (!response.ok) {
      response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiToken
        },
        body: JSON.stringify({
          number: formatPhoneNumber(phoneNumber),
          mediatype: "audio",
          mimetype: "audio/ogg; codecs=opus",
          media: base64Data,
          ptt: ptt
        })
      });
    }

    if (response.ok) {
      let keyId: string | undefined;
      try {
        const json = await response.json();
        keyId = json.key?.id || json.id || json.messageId;
      } catch (_) {}
      return { success: true, keyId };
    } else {
      const errText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
  }
}

/**
 * Obtém o Base64 da mídia encriptada da Evolution API caso o webhook não traga URL pública
 */
export async function getBase64FromEvolutionMedia(messageObj: any): Promise<string | null> {
  const { apiUrl, apiToken, instanceName } = await getWhatsAppConfig();
  if (!apiUrl || !apiToken) return null;

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const response = await fetch(`${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiToken
      },
      body: JSON.stringify({
        message: messageObj,
        convertToMp4: false
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result.base64 || result.data || null;
    }
  } catch (err: any) {
    console.warn(`[WhatsApp Service] Não foi possível extrair base64 da mídia: ${err.message}`);
  } finally {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
  }
  return null;
}

/**
 * Salva base64 de mídia no disco (/public/uploads/whatsapp) e retorna a URL acessível pelo frontend
 */
export async function saveMediaToFile(
  base64OrBuffer: Buffer | string,
  filePrefix: string = "whatsapp_media",
  mimeType: string = "application/octet-stream"
): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const uploadDir = path.join(process.cwd(), "public", "uploads", "whatsapp");
  await fs.mkdir(uploadDir, { recursive: true });

  let extension = ".bin";
  if (mimeType.includes("pdf")) extension = ".pdf";
  else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = ".jpg";
  else if (mimeType.includes("png")) extension = ".png";
  else if (mimeType.includes("webp")) extension = ".webp";
  else if (mimeType.includes("ogg") || mimeType.includes("opus")) extension = ".ogg";
  else if (mimeType.includes("mp3")) extension = ".mp3";
  else if (mimeType.includes("mp4")) extension = ".mp4";
  else if (mimeType.includes("webm")) extension = ".webm";
  else if (mimeType.includes("document") || mimeType.includes("docx")) extension = ".docx";
  else if (mimeType.includes("sheet") || mimeType.includes("xlsx")) extension = ".xlsx";

  const fileName = `${filePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${extension}`;
  const filePath = path.join(uploadDir, fileName);

  const buffer = typeof base64OrBuffer === "string"
    ? Buffer.from(base64OrBuffer.replace(/^data:[^;]+;base64,/, ""), "base64")
    : base64OrBuffer;

  await fs.writeFile(filePath, buffer);
  return `/uploads/whatsapp/${fileName}`;
}

/**
 * Resolve o modelo de documento PDF a ser gerado para o status informado.
 */
function resolveTemplateIdForStatus(status: string, closingReason?: string | null): { templateId: DocumentTemplateId; fileNamePrefix: string } | null {
  if (status === "AGUARDANDO_AVALIACAO") {
    return { templateId: "termo", fileNamePrefix: "Termo-Recebimento" };
  }
  if (status === "AGUARDANDO_AUTORIZACAO") {
    return { templateId: "orcamento", fileNamePrefix: "Orcamento" };
  }
  if (status === "PRONTO_RETIRADA") {
    return { templateId: "recibo", fileNamePrefix: "Laudo-Conclusao" };
  }
  if (status === "FINALIZADO") {
    if (closingReason === "ORCAMENTO_RECUSADO") {
      return { templateId: "termo", fileNamePrefix: "Devolucao" };
    }
    if (closingReason === "DESCARTE_CLIENTE_RETIRA" || closingReason === "DESCARTE_OFICINA") {
      return { templateId: "termo", fileNamePrefix: "Certificado-Descarte" };
    }
    return { templateId: "recibo", fileNamePrefix: "Recibo-Entrega" };
  }
  return null;
}

export async function triggerWhatsAppNotification(orderId: string, status: string): Promise<boolean> {
  try {
    const isEnabled = await featureFlags.isEnabled("WHATSAPP_AUTO_MESSAGES");
    if (!isEnabled) {
      console.log(`[WhatsApp Service] Disparo abortado: Feature Flag 'WHATSAPP_AUTO_MESSAGES' inativa.`);
      return false;
    }

    // Consulta configuração do modo de disparo: 'approval' (padrão seguro), 'auto' (direto) ou 'disabled'
    const autoSetting = await prisma.officeSetting.findUnique({ where: { key: 'WHATSAPP_AUTO_MESSAGES' } });
    const sendMode = (autoSetting?.value || "approval").toLowerCase();

    if (sendMode === "disabled" || sendMode === "false") {
      console.log(`[WhatsApp Service] Disparos desativados nas configurações.`);
      return false;
    }

    // Governança: Não incomodar fora do horário comercial (apenas loga aviso se for fora do horário)
    if (!isWithinBusinessHours()) {
      console.log(`[WhatsApp Service] Aviso: Disparo fora do horário comercial para OS ${orderId}. Prosseguindo com registro.`);
    }

    const os = await prisma.ordemServico.findUnique({
      where: { id: orderId },
      include: { client: true, device: true }
    });

    if (!os || !os.client || !os.device) {
      console.log(`[WhatsApp Service] Disparo abortado: Dados da OS ${orderId} insuficientes.`);
      return false;
    }

    if (status === "AGUARDANDO_AUTORIZACAO" && (!os.diagnostic || os.totalCost === 0)) {
      console.log(`[WhatsApp Service] Disparo abortado para status AGUARDANDO_AUTORIZACAO: orçamento ainda não preenchido/precificado.`);
      return false;
    }

    // Debounce Anti-Duplicação: Verifica se já enviou mensagem idêntica nos últimos 10 minutos
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentDuplicate = await prisma.messageHistory.findFirst({
      where: {
        orderId: os.id,
        status: { in: ["ENVIADO", "PENDENTE", "AGUARDANDO_APROVACAO"] },
        createdAt: { gte: tenMinutesAgo }
      },
      orderBy: { createdAt: "desc" }
    });

    if (recentDuplicate && recentDuplicate.messageText.includes(os.osNumber)) {
      console.log(`[WhatsApp Service] Disparo abortado: Mensagem recente pendente ou enviada nos últimos 10 minutos para a OS ${os.osNumber}.`);
      return false;
    }

    // Seleciona template com base no status e no closingReason
    let templateKey = status;
    if (status === "FINALIZADO") {
      if (os.closingReason === "ORCAMENTO_RECUSADO") {
        templateKey = "ORCAMENTO_RECUSADO";
      } else if (os.closingReason === "DESCARTE_CLIENTE_RETIRA" || os.closingReason === "DESCARTE_OFICINA") {
        templateKey = "DESCARTE";
      }
    }

    const template = WHATSAPP_TEMPLATES[templateKey];
    if (!template) {
      console.log(`[WhatsApp Service] Sem template cadastrado para a chave ${templateKey}.`);
      return false;
    }

    // Link oficial dinâmico para acompanhamento
    const clientCpfClean = (os.client.cpfCnpj || "").replace(/\D/g, "");
    const linkPortal = `https://sistema.mgvrp.com.br/acompanhar?numero=${os.osNumber}&cpfCnpj=${clientCpfClean}`;

    const formattedText = formatWhatsAppMessage(template, {
      cliente_nome: os.client.name.split(" ")[0],
      os_numero: os.osNumber,
      aparelho_modelo: os.device.model,
      aparelho_marca: os.device.brand,
      valor_total: (os.totalCost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      link_portal: linkPortal
    });

    const isDirectAuto = sendMode === "auto";

    const history = await prisma.messageHistory.create({
      data: {
        orderId: os.id,
        phoneNumber: os.client.phone,
        messageText: formattedText,
        status: isDirectAuto ? "PENDENTE" : "AGUARDANDO_APROVACAO",
        errorDetail: status // Salva o status de origem para resolução do PDF na aprovação
      }
    });

    // Se NÃO for envio direto automático, encerra aqui (fica aguardando aprovação humana pela atendente)
    if (!isDirectAuto) {
      console.log(`[WhatsApp Service] Mensagem para OS ${os.osNumber} colocada na fila de AGUARDANDO_APROVACAO.`);
      
      // Notifica todos os operadores conectados em tempo real via SSE instantâneo
      realtimeEvents.broadcast("whatsapp_approval_required", {
        messageId: history.id,
        orderId: os.id,
        osNumber: os.osNumber,
        clientName: os.client.name,
        clientPhone: os.client.phone,
        previewText: formattedText
      });
      
      return true;
    }

    // Disparo assíncrono com documento PDF em anexo (quando em modo automático)
    setTimeout(async () => {
      try {
        const docMapping = resolveTemplateIdForStatus(status, os.closingReason);
        let pdfBuffer: Buffer | null = null;
        let fileName = `Documento-${os.osNumber}.pdf`;

        if (docMapping) {
          try {
            const docTemplate = DOCUMENT_TEMPLATES[docMapping.templateId];
            if (docTemplate) {
              pdfBuffer = await buildDocumentPdf(docTemplate, os as unknown as PdfOsData);
              fileName = `${docMapping.fileNamePrefix}-${os.osNumber}.pdf`;
            }
          } catch (pdfErr: any) {
            console.warn(`[WhatsApp Service] Aviso: Falha ao gerar PDF (${pdfErr.message}), enviando somente texto.`);
          }
        }

        let sendResult: { success: boolean; error?: string };

        if (pdfBuffer) {
          sendResult = await sendWhatsAppDocumentMessage(
            os.client.phone,
            pdfBuffer,
            fileName,
            formattedText
          );
        } else {
          sendResult = await sendWhatsAppTextMessage(
            os.client.phone,
            formattedText
          );
        }

        if (sendResult.success) {
          await prisma.messageHistory.update({
            where: { id: history.id },
            data: { status: "ENVIADO" }
          });
        } else {
          await prisma.messageHistory.update({
            where: { id: history.id },
            data: { status: "FALHOU", errorDetail: sendResult.error }
          });
        }
      } catch (sendErr: any) {
        await prisma.messageHistory.update({
          where: { id: history.id },
          data: { status: "FALHOU", errorDetail: sendErr.message }
        });
      }
    }, 1500);

    return true;
  } catch (err) {
    console.error("[WhatsApp Service] Erro geral ao disparar notificação:", err);
    return false;
  }
}

/**
 * Consulta mensagens pendentes de aprovação humana.
 */
export async function getPendingWhatsAppApprovals(orderId?: string) {
  return prisma.messageHistory.findMany({
    where: {
      status: "AGUARDANDO_APROVACAO",
      ...(orderId ? { orderId } : {})
    },
    include: {
      order: {
        include: {
          client: true,
          device: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Aprova e dispara uma mensagem de WhatsApp pendente.
 */
export async function approveWhatsAppMessage(messageId: string, customText?: string) {
  const history = await prisma.messageHistory.findUnique({
    where: { id: messageId },
    include: {
      order: {
        include: { client: true, device: true }
      }
    }
  });

  if (!history || !history.order || !history.order.client) {
    throw new Error("Mensagem ou dados da Ordem de Serviço não encontrados.");
  }

  if (history.status !== "AGUARDANDO_APROVACAO") {
    throw new Error(`Esta mensagem não está aguardando aprovação (Status atual: ${history.status}).`);
  }

  const os = history.order;
  const messageToSend = customText || history.messageText;
  const statusOrigem = history.errorDetail || os.status;

  const docMapping = resolveTemplateIdForStatus(statusOrigem, os.closingReason);
  let pdfBuffer: Buffer | null = null;
  let fileName = `Documento-${os.osNumber}.pdf`;

  if (docMapping) {
    try {
      const docTemplate = DOCUMENT_TEMPLATES[docMapping.templateId];
      if (docTemplate) {
        pdfBuffer = await buildDocumentPdf(docTemplate, os as unknown as PdfOsData);
        fileName = `${docMapping.fileNamePrefix}-${os.osNumber}.pdf`;
      }
    } catch (pdfErr: any) {
      console.warn(`[WhatsApp Service] Falha ao gerar PDF no envio aprovado: ${pdfErr.message}`);
    }
  }

  let sendResult: { success: boolean; error?: string };

  if (pdfBuffer) {
    sendResult = await sendWhatsAppDocumentMessage(
      os.client.phone,
      pdfBuffer,
      fileName,
      messageToSend
    );
  } else {
    sendResult = await sendWhatsAppTextMessage(
      os.client.phone,
      messageToSend
    );
  }

  if (sendResult.success) {
    const updated = await prisma.messageHistory.update({
      where: { id: messageId },
      data: {
        messageText: messageToSend,
        status: "ENVIADO",
        errorDetail: null
      }
    });
    realtimeEvents.broadcast("whatsapp_approval_resolved", { messageId, status: "ENVIADO" });
    return { success: true, message: updated };
  } else {
    await prisma.messageHistory.update({
      where: { id: messageId },
      data: {
        messageText: messageToSend,
        status: "FALHOU",
        errorDetail: sendResult.error || "Falha no envio via Evolution API"
      }
    });
    throw new Error(sendResult.error || "Falha ao enviar mensagem via WhatsApp.");
  }
}

/**
 * Rejeita/descarta uma mensagem de WhatsApp pendente.
 */
export async function rejectWhatsAppMessage(messageId: string, reason?: string) {
  const history = await prisma.messageHistory.findUnique({
    where: { id: messageId }
  });

  if (!history) {
    throw new Error("Mensagem não encontrada.");
  }

  const updated = await prisma.messageHistory.update({
    where: { id: messageId },
    data: {
      status: "CANCELADO",
      errorDetail: reason ? `Recusada pelo operador: ${reason}` : "Recusada pelo operador"
    }
  });

  realtimeEvents.broadcast("whatsapp_approval_resolved", { messageId, status: "CANCELADO" });

  return updated;
}

