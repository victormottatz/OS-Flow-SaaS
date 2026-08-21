import prisma from "../database/prisma";
import { featureFlags } from "./FeatureFlagService";
import { buildDocumentPdf, PdfOsData } from "./pdfService";
import { DOCUMENT_TEMPLATES, DocumentTemplateId } from "../config/documents.config";

const WHATSAPP_TEMPLATES: Record<string, string> = {
  AGUARDANDO_AVALIACAO: 
    "🩺 *Olá, {cliente_nome}! Tudo bem?*\n\n" +
    "Confirmamos a entrada do seu equipamento *{aparelho_marca} {aparelho_modelo}* em nosso laboratório técnico sob a *OS #{os_numero}*.\n\n" +
    "📎 *Segue em anexo o seu Termo de Recebimento com o checklist de entrada.*\n\n" +
    "Nossa equipe especializada já iniciou a triagem pericial e em breve enviaremos o laudo com o diagnóstico completo.\n\n" +
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
    "Para garantir a máxima qualidade e durabilidade no conserto do seu *{aparelho_modelo}*, solicitamos componentes novos e originais de fábrica.\n\n" +
    "Assim que as peças chegarem em nossa bancada técnica, daremos prioridade imediata à montagem e calibração. Manteremos você informado! ⚙️",

  EM_MANUTENCAO: 
    "⚙️ *Olá, {cliente_nome}!*\n\n" +
    "Informamos que a manutenção do seu equipamento *{aparelho_modelo}* (OS *#{os_numero}*) já foi iniciada na bancada técnica por nossos especialistas.\n\n" +
    "Em breve seu aparelho passará pelos testes finais de calibração! 🔬",

  PRONTO_RETIRADA: 
    "🎉 *Ótima notícia, {cliente_nome}!*\n\n" +
    "O seu equipamento *{aparelho_modelo}* (OS *#{os_numero}*) concluiu com sucesso todas as etapas de reparo, revisão e calibração técnica!\n\n" +
    "📍 *Seu aparelho já está disponível para retirada na MGV:*\n" +
    "🏢 *Endereço:* Rua Julio Prestes, 648 - Jardim Sumaré, Ribeirão Preto - SP\n" +
    "⏰ *Horário de Atendimento:* Segunda a Sexta, das 08h às 18h\n\n" +
    "📎 *Segue em anexo o seu Laudo Técnico / Certificado de Calibração.*\n\n" +
    "💬 _Aguardamos sua visita! Caso prefira agilizar o faturamento via PIX antes da retirada, basta solicitar a chave por esta conversa._",

  FINALIZADO: 
    "🤝 *Equipamento Entregue com Sucesso!*\n\n" +
    "Olá, *{cliente_nome}*! A Ordem de Serviço *#{os_numero}* do seu *{aparelho_modelo}* foi concluída e o equipamento entregue.\n\n" +
    "📎 *Segue em anexo o seu Recibo Oficial de Entrega com o Termo de Garantia de 90 dias.*\n\n" +
    "Agradecemos imensamente a confiança na MGV Assistência Técnica! Sempre que precisar de suporte ou novas calibrações, estamos à sua disposição. ✨",

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
 * Segunda a Sexta: 08h às 19h | Sábados: 08h às 13h | Domingos: Bloqueado
 */
export function isWithinBusinessHours(): boolean {
  const now = new Date();
  const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const day = spTime.getDay(); // 0 = Domingo, 6 = Sábado
  const hour = spTime.getHours();

  if (day === 0) return false;
  if (day === 6) return hour >= 8 && hour < 13;
  return hour >= 8 && hour < 19;
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
): Promise<{ success: boolean; error?: string }> {
  const { apiUrl, apiToken, instanceName } = await getWhatsAppConfig();

  if (!apiUrl || !apiToken) {
    console.log(`\n[WhatsApp Gateway Simulado] Mensagem enviada para ${phoneNumber}:`);
    console.log(messageText);
    return { success: true };
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
      return { success: true };
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
): Promise<{ success: boolean; error?: string }> {
  const { apiUrl, apiToken, instanceName } = await getWhatsAppConfig();

  if (!apiUrl || !apiToken) {
    console.log(`\n[WhatsApp Gateway Simulado] Documento (${fileName}) enviado para ${phoneNumber}:`);
    console.log(captionText);
    return { success: true };
  }

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const base64Data = pdfBuffer.toString("base64");

    const response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiToken
      },
      body: JSON.stringify({
        number: formatPhoneNumber(phoneNumber),
        mediatype: "document",
        mimetype: "application/pdf",
        caption: captionText,
        fileName: fileName,
        media: base64Data
      })
    });

    if (response.ok) {
      return { success: true };
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
        status: { in: ["ENVIADO", "PENDENTE"] },
        createdAt: { gte: tenMinutesAgo }
      },
      orderBy: { createdAt: "desc" }
    });

    if (recentDuplicate && recentDuplicate.messageText.includes(os.osNumber)) {
      console.log(`[WhatsApp Service] Disparo abortado: Mensagem recente enviada nos últimos 10 minutos para a OS ${os.osNumber}.`);
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

    const history = await prisma.messageHistory.create({
      data: {
        orderId: os.id,
        phoneNumber: os.client.phone,
        messageText: formattedText,
        status: "PENDENTE"
      }
    });

    // Disparo assíncrono com documento PDF em anexo (quando aplicável)
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
