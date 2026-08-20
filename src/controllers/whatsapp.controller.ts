import { Request, Response } from "express";
import prisma from "../database/prisma";
import crypto from "crypto";

export class WhatsAppController {
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
    const { orderId, messageText } = req.body;

    if (!orderId || !messageText) {
      res.status(400).json({ error: "Parâmetros orderId e messageText são obrigatórios." });
      return;
    }

    try {
      const os = await prisma.ordemServico.findUnique({
        where: { id: orderId },
        include: { client: true }
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

      const apiUrl = process.env.WHATSAPP_API_URL;
      const apiToken = process.env.WHATSAPP_API_TOKEN;

      setTimeout(async () => {
        try {
          if (apiUrl && apiToken) {
            const response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiToken}`
              },
              body: JSON.stringify({
                number: os.client.phone.replace(/\D/g, ""),
                message: messageText
              })
            });

            if (response.ok) {
              await prisma.messageHistory.update({
                where: { id: history.id },
                data: { status: "ENVIADO" }
              });
            } else {
              const errText = await response.text();
              await prisma.messageHistory.update({
                where: { id: history.id },
                data: { status: "FALHOU", errorDetail: `HTTP ${response.status}: ${errText}` }
              });
            }
          } else {
            // Modo Simulado
            console.log(`\n======================================================`);
            console.log(`[WhatsApp Manual Simulado] Enviando Mensagem...`);
            console.log(`Destinatário: ${os.client.phone}`);
            console.log(`Mensagem: ${messageText}`);
            console.log(`======================================================\n`);

            await prisma.messageHistory.update({
              where: { id: history.id },
              data: { status: "ENVIADO" }
            });
          }
        } catch (sendErr: any) {
          await prisma.messageHistory.update({
            where: { id: history.id },
            data: { status: "FALHOU", errorDetail: sendErr.message }
          });
        }
      }, 1500);

      res.status(201).json({ success: true, message: "Mensagem agendada para envio." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
  async connect(req: Request, res: Response) {
    const apiUrl = process.env.WHATSAPP_API_URL || "https://whatsapp.mgvrp.com.br";
    const apiToken = process.env.WHATSAPP_API_TOKEN || "K8kL3mZ9pQ2wE5";
    const instanceName = "mgv_hub";

    try {
      // Tenta criar a instância com fetch nativo (suporta node 18+)
      await fetch(`${apiUrl}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiToken },
        body: JSON.stringify({
          instanceName,
          token: instanceName,
          qrcode: true
        })
      }).catch(() => {});

      // Pega o QR code
      const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        headers: { apikey: apiToken }
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getState(req: Request, res: Response) {
    const apiUrl = process.env.WHATSAPP_API_URL || "https://whatsapp.mgvrp.com.br";
    const apiToken = process.env.WHATSAPP_API_TOKEN || "K8kL3mZ9pQ2wE5";
    const instanceName = "mgv_hub";

    try {
      const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiToken }
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async logout(req: Request, res: Response) {
    const apiUrl = process.env.WHATSAPP_API_URL || "https://whatsapp.mgvrp.com.br";
    const apiToken = process.env.WHATSAPP_API_TOKEN || "K8kL3mZ9pQ2wE5";
    const instanceName = "mgv_hub";

    try {
      const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: { apikey: apiToken }
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const whatsAppController = new WhatsAppController();
