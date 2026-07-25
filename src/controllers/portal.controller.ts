import { Request, Response } from "express";
import prisma from "../database/prisma";
import { OSStateMachine } from "../domain/os/os.state-machine";
import { OSStatus } from "../types";

// ─── UTILS DE MAPEAMENTO DE STATUS GERENCIAL ────────────────────────────────
function getStatusLabel(status: string, closingReason?: string): string {
  switch (status) {
    case "AGUARDANDO_AVALIACAO": return "Aguardando Avaliação";
    case "AGUARDANDO_AUTORIZACAO": return "Aguardando Autorização";
    case "AGUARDANDO_PECA": return "Aguardando Peça";
    case "EM_MANUTENCAO": return "Em Manutenção";
    case "PRONTO_RETIRADA":
    case "PAGO_PRONTO_RETIRADA": return "Pronto para Retirada";
    case "FINALIZADO":
      if (closingReason === "ORCAMENTO_RECUSADO") return "Orçamento Recusado";
      if (closingReason === "DESCARTE_CLIENTE_RETIRA" || closingReason === "DESCARTE_OFICINA") return "Inviável/Descarte";
      return "Finalizado";
    default: return "Em Análise";
  }
}

function getStatusMessage(status: string, closingReason?: string): string {
  switch (status) {
    case "AGUARDANDO_AVALIACAO": return "Seu equipamento deu entrada e está aguardando avaliação técnica.";
    case "AGUARDANDO_AUTORIZACAO": return "O orçamento para conserto do seu equipamento está pronto e aguardando aprovação.";
    case "AGUARDANDO_PECA": return "Orçamento aprovado. Aguardando entrega de peças específicas.";
    case "EM_MANUTENCAO": return "Equipamento em manutenção técnica em nossa bancada.";
    case "PRONTO_RETIRADA":
    case "PAGO_PRONTO_RETIRADA": return "Serviço concluído com sucesso. Equipamento disponível para retirada.";
    case "FINALIZADO":
      if (closingReason === "ORCAMENTO_RECUSADO") {
        return "O reparo não foi realizado. Seu equipamento está disponível para retirada na oficina.";
      }
      if (closingReason === "DESCARTE_CLIENTE_RETIRA") {
        return "O equipamento foi avaliado como inviável para reparo e está disponível para retirada.";
      }
      if (closingReason === "DESCARTE_OFICINA") {
        return "O equipamento foi avaliado como inviável para reparo e será descartado de forma adequada pela oficina.";
      }
      return "Ordem de serviço finalizada e equipamento retirado.";
    default: return "Equipamento em triagem inicial.";
  }
}

function getStatusColor(status: string): "yellow" | "orange" | "blue" | "green" | "purple" | "gray" {
  switch (status) {
    case "AGUARDANDO_AVALIACAO": return "gray";
    case "AGUARDANDO_AUTORIZACAO": return "yellow";
    case "AGUARDANDO_PECA": return "orange";
    case "EM_MANUTENCAO": return "blue";
    case "PRONTO_RETIRADA":
    case "PAGO_PRONTO_RETIRADA": return "green";
    case "FINALIZADO": return "purple";
    default: return "gray";
  }
}

function getStatusStep(status: string): number {
  switch (status) {
    case "AGUARDANDO_AVALIACAO": return 1;
    case "AGUARDANDO_AUTORIZACAO": return 2;
    case "AGUARDANDO_PECA": return 3;
    case "EM_MANUTENCAO": return 4;
    case "PRONTO_RETIRADA":
    case "PAGO_PRONTO_RETIRADA": return 5;
    case "FINALIZADO": return 6;
    default: return 1;
  }
}

function generateTimeline(os: any): any[] {
  const timeline = [];
  const entryDate = os.createdAt;

  // Entrada
  timeline.push({
    date: entryDate.toISOString(),
    title: "Entrada na Assistência",
    description: "Equipamento recebido na recepção e cadastrado no sistema."
  });

  const step = getStatusStep(os.status);

  // Orçamento (acontece no mesmo dia/início)
  if (step >= 1) {
    const budgetDate = new Date(entryDate.getTime() + 30 * 60 * 1000); // +30 min
    timeline.push({
      date: budgetDate.toISOString(),
      title: "Orçamento Gerado",
      description: "Análise técnica realizada e orçamento disponível."
    });
  }

  // Aprovado / Em manutenção (geralmente +12 horas ou no mesmo dia)
  if (step >= 3) {
    const approveDate = new Date(entryDate.getTime() + 12 * 60 * 60 * 1000); // +12 horas
    timeline.push({
      date: approveDate.toISOString(),
      title: "Orçamento Aprovado",
      description: "Orçamento aceito pelo cliente. Reparo técnico iniciado."
    });
  }

  // Pronto para retirada (+24 horas ou no mesmo dia)
  if (step >= 4) {
    const readyDate = new Date(entryDate.getTime() + 24 * 60 * 60 * 1000); // +24 horas
    timeline.push({
      date: readyDate.toISOString(),
      title: "Reparo Concluído",
      description: "Equipamento consertado, testado e pronto para retirada."
    });
  }

  // Finalizado (Entrega)
  if (step === 5) {
    const exitDate = os.originalExitDate || new Date(entryDate.getTime() + 36 * 60 * 60 * 1000);
    timeline.push({
      date: exitDate instanceof Date ? exitDate.toISOString() : new Date(exitDate).toISOString(),
      title: "Equipamento Entregue",
      description: "Equipamento retirado pelo cliente na recepção da MGV."
    });
  }

  return timeline.reverse(); // Mais recente primeiro
}

export class PortalController {
  async getOS(req: Request, res: Response) {
    try {
      const { numero, cpfCnpj } = req.query;

      if (!numero || !cpfCnpj) {
        res.status(400).json({ error: "Número da OS e CPF/CNPJ são obrigatórios." });
        return;
      }

      const osNumberStr = String(numero).trim();
      const inputDigits = String(cpfCnpj).replace(/\D/g, "");

      if (!inputDigits) {
        res.status(400).json({ error: "CPF/CNPJ inválido." });
        return;
      }

      const os = await prisma.ordemServico.findFirst({
        where: {
          osNumber: osNumberStr,
          deletedAt: null
        },
        include: {
          client: true,
          device: true
        }
      });

      if (!os || !os.client || os.client.deletedAt !== null || !os.device || os.device.deletedAt !== null) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada ou dados divergentes." });
        return;
      }

      // Validar CPF/CNPJ de forma completa (removendo caracteres especiais de ambos)
      const clientDigits = os.client.cpfCnpj.replace(/\D/g, "");
      if (inputDigits !== clientDigits) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada ou dados divergentes." });
        return;
      }

      // Hide internal data (anotações de bancada) and build the public structure
      const publicOS = {
        osNumber: os.osNumber,
        status: os.status === "PAGO_PRONTO_RETIRADA" ? "PRONTO_RETIRADA" : os.status,
        statusLabel: getStatusLabel(os.status, os.closingReason || undefined),
        statusMessage: getStatusMessage(os.status, os.closingReason || undefined),
        statusColor: getStatusColor(os.status),
        statusStep: getStatusStep(os.status),
        closingReason: os.closingReason,
        deviceLabel: `${os.device.brand} ${os.device.model} (S/N: ${os.device.serialNumber})`,
        reportedDefect: os.reportedDefect,
        accessoriesLeft: os.accessoriesLeft || "Nenhum",
        createdAt: os.createdAt.toISOString(),
        clientName: os.client.name,
        totalCost: os.totalCost,
        laborCost: os.laborCost,
        usedParts: typeof os.usedParts === "string" ? JSON.parse(os.usedParts) : os.usedParts || [],
        diagnostic: os.laudoMacro || "", // Oculta o diagnostic original (anotação técnica) e retorna o laudo macro como "diagnostic" para compatibilidade com o frontend
        laudoFotos: typeof os.laudoFotos === "string" ? JSON.parse(os.laudoFotos || "[]") : os.laudoFotos || [],
        warrantyExpiresAt: os.device.warrantyExpiresAt ? os.device.warrantyExpiresAt.toISOString() : null,
        timeline: generateTimeline(os)
      };

      res.json(publicOS);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async approveOS(req: Request, res: Response) {
    try {
      const { osNumber, cpfCnpj } = req.body;
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "UNKNOWN";

      if (!osNumber || !cpfCnpj) {
        res.status(400).json({ error: "Dados incompletos." });
        return;
      }

      const inputDigits = String(cpfCnpj).replace(/\D/g, "");

      const os = await prisma.ordemServico.findFirst({
        where: {
          osNumber: String(osNumber),
          deletedAt: null
        },
        include: {
          client: true
        }
      });

      if (!os || !os.client || os.client.deletedAt !== null) {
        res.status(404).json({ error: "OS não encontrada ou dados inválidos." });
        return;
      }

      // Validar CPF/CNPJ de forma completa (removendo caracteres especiais de ambos)
      const clientDigits = os.client.cpfCnpj.replace(/\D/g, "");
      if (inputDigits !== clientDigits) {
        res.status(404).json({ error: "OS não encontrada ou dados inválidos." });
        return;
      }

      // Validar transição usando a FSM estática — somente OSs em AGUARDANDO_AUTORIZACAO podem ser aprovadas pelo cliente
      if (!await OSStateMachine.canTransition(os.status as OSStatus, "EM_MANUTENCAO")) {
        res.status(400).json({ error: "Esta OS não pode ser aprovada neste momento. Verifique se o orçamento já foi elaborado e enviado para autorização." });
        return;
      }

      // We just update the status to EM_MANUTENCAO directly when client approves
      const updatedOS = await prisma.ordemServico.update({
        where: { id: os.id },
        data: {
          status: "EM_MANUTENCAO",
          diagnostic: os.diagnostic ? `${os.diagnostic}\n[Portal] Cliente aceitou orçamento (IP: ${clientIp})` : `[Portal] Cliente aceitou orçamento (IP: ${clientIp})`
        }
      });

      res.json({ message: "Orçamento aprovado com sucesso eletronicamente." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const portalController = new PortalController();
