import { Request, Response } from "express";
import prisma from "../database/prisma";
import crypto from "crypto";
import { formatPhoneNumber, sendWhatsAppTextMessage, sendWhatsAppDocumentMessage, getPendingWhatsAppApprovals, approveWhatsAppMessage, rejectWhatsAppMessage } from "../services/whatsapp";
import { buildDocumentPdf, PdfOsData } from "../services/pdfService";
import { DOCUMENT_TEMPLATES, DocumentTemplateId } from "../config/documents.config";

export class WhatsAppController {
  private async getWhatsAppConfig() {
    let apiUrl = process.env.WHATSAPP_API_URL;
    let apiToken = process.env.WHATSAPP_API_TOKEN;
    let instanceName = process.env.WHATSAPP_INSTANCE_NAME || "mgv_oficial";

    if (!apiUrl) {
      const dbUrl = await prisma.officeSetting.findFirst({ where: { key: 'WHATSAPP_API_URL' } });
      apiUrl = dbUrl?.value;
    }
    if (!apiToken) {
      const dbToken = await prisma.officeSetting.findFirst({ where: { key: 'WHATSAPP_API_TOKEN' } });
      apiToken = dbToken?.value;
    }
    const dbInstance = await prisma.officeSetting.findFirst({ where: { key: 'WHATSAPP_INSTANCE_NAME' } });
    if (dbInstance?.value) instanceName = dbInstance.value;

    if (apiUrl) apiUrl = apiUrl.replace(/\/+$/, "");

    return { apiUrl, apiToken, instanceName };
  }

  async getHistory(req: Request, res: Response) {
    const { orderId } = req.params;
    try {
      const history = await prisma.messageHistory.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" }
      });
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async sendManual(req: Request, res: Response) {
    const { orderId, messageText, templateId } = req.body;

    if (!orderId || !messageText) {
      res.status(400).json({ error: "Parâmetros orderId e messageText são obrigatórios." });
      return;
    }

    try {
      const os = await prisma.ordemServico.findUnique({
        where: { id: orderId },
        include: { client: true, device: true }
      });

      if (!os || !os.client) {
        res.status(404).json({ error: "Ordem de Serviço ou Cliente correspondente não encontrado." });
        return;
      }

      const history = await prisma.messageHistory.create({
        data: {
          orderId: os.id,
          phoneNumber: os.client.phone,
          messageText,
          status: "PENDENTE"
        }
      });

      setTimeout(async () => {
        try {
          let pdfBuffer: Buffer | null = null;
          let fileName = `Documento-${os.osNumber}.pdf`;

          if (templateId && DOCUMENT_TEMPLATES[templateId as DocumentTemplateId]) {
            try {
              const docTemplate = DOCUMENT_TEMPLATES[templateId as DocumentTemplateId];
              pdfBuffer = await buildDocumentPdf(docTemplate, os as unknown as PdfOsData);
              fileName = `${docTemplate.nomeArquivo}-${os.osNumber}.pdf`;
            } catch (pdfErr: any) {
              console.warn(`[WhatsApp Controller] Erro ao gerar PDF manual: ${pdfErr.message}`);
            }
          }

          let sendResult: { success: boolean; error?: string };

          if (pdfBuffer) {
            sendResult = await sendWhatsAppDocumentMessage(
              os.client.phone,
              pdfBuffer,
              fileName,
              messageText
            );
          } else {
            sendResult = await sendWhatsAppTextMessage(
              os.client.phone,
              messageText
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
      }, 500);

      res.status(201).json({ success: true, message: "Mensagem agendada para envio com sucesso." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async connect(req: Request, res: Response) {
    const { apiUrl, apiToken, instanceName } = await this.getWhatsAppConfig();

    if (!apiUrl || !apiToken) {
      console.log(`\n======================================================`);
      console.log(`[WhatsApp API Simulado] Nenhuma credencial configurada.`);
      console.log(`======================================================\n`);
      return res.json({ instance: { state: "open" }, simulated: true, base64: "" });
    }

    try {
      // Ignorar erros de SSL (caso de certificado autoassinado) apenas para chamadas da API
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      // 1. Tenta criar a instância (Evolution v1 e v2 compatível)
      try {
        const createRes = await fetch(`${apiUrl}/instance/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: apiToken },
          body: JSON.stringify({
            instanceName,
            token: instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          })
        });

        if (!createRes.ok && createRes.status !== 403 && createRes.status !== 400) {
          const errText = await createRes.text();
          console.warn(`[WhatsApp API] Criar instância status HTTP ${createRes.status}: ${errText}`);
        }
      } catch (createErr: any) {
        console.warn(`[WhatsApp API] Aviso ao criar instância: ${createErr.message}`);
      }

      // 2. Busca o QR Code ou status da conexão
      const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        headers: { apikey: apiToken }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();

      // Normalização do QR Code para o frontend
      let base64Code = data.base64 || data.qrcode?.base64 || "";
      if (base64Code && !base64Code.startsWith("data:image")) {
        base64Code = `data:image/png;base64,${base64Code}`;
      }

      return res.json({
        ...data,
        base64: base64Code,
        instanceName,
        pairingCode: data.pairingCode || data.code || null
      });
    } catch (err: any) {
      console.error("[WhatsApp API] Erro ao conectar na Evolution API:", err.message);
      return res.status(502).json({
        error: `Falha na comunicação com a Evolution API (${apiUrl}): ${err.message}`,
        details: err.message
      });
    } finally {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
    }
  }

  async getState(req: Request, res: Response) {
    const { apiUrl, apiToken, instanceName } = await this.getWhatsAppConfig();

    if (!apiUrl || !apiToken) {
      return res.json({ instance: { state: "open" }, simulated: true });
    }

    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiToken }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.warn("[WhatsApp API] Erro ao verificar estado da instância:", err.message);
      return res.status(502).json({
        error: `Erro ao verificar estado: ${err.message}`,
        instance: { state: "close" }
      });
    } finally {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
    }
  }

  async logout(req: Request, res: Response) {
    const { apiUrl, apiToken, instanceName } = await this.getWhatsAppConfig();

    if (!apiUrl || !apiToken) {
      console.log(`\n======================================================`);
      console.log(`[WhatsApp API Simulado] Desconectando...`);
      console.log(`======================================================\n`);
      return res.json({ success: true });
    }

    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: { apikey: apiToken }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error("[WhatsApp API] Erro ao fazer logout:", err.message);
      return res.status(500).json({ error: `Erro ao tentar desconectar a instância: ${err.message}` });
    } finally {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
    }
  }

  async getPendingApprovals(req: Request, res: Response) {
    try {
      const { orderId } = req.query;
      const pendings = await getPendingWhatsAppApprovals(orderId as string | undefined);
      res.json(pendings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async approveMessage(req: Request, res: Response) {
    const { id } = req.params;
    const { customText } = req.body;
    try {
      const result = await approveWhatsAppMessage(id, customText);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async rejectMessage(req: Request, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;
    try {
      const result = await rejectWhatsAppMessage(id, reason);
      res.json({ success: true, message: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export const whatsAppController = new WhatsAppController();

