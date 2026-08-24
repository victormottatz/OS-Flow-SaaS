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
  const entryDate = os.entryDate ? new Date(os.entryDate) : new Date(os.createdAt);

  // 1. Entrada
  timeline.push({
    date: entryDate.toISOString(),
    title: "Entrada na Assistência",
    description: "Equipamento recebido na recepção e cadastrado no sistema."
  });

  const step = getStatusStep(os.status);

  // 2. Orçamento (Disponibilizado para avaliação/autorização)
  if (step >= 2) {
    const budgetDate = new Date(entryDate.getTime() + 30 * 60 * 1000); // Estimativa inicial
    timeline.push({
      date: budgetDate.toISOString(),
      title: "Orçamento Elaborado",
      description: "Análise técnica realizada e orçamento disponibilizado para autorização."
    });
  }

  // 3. Aprovado / Em manutenção
  if (step >= 4 || os.status === "EM_MANUTENCAO" || os.status === "AGUARDANDO_PECA") {
    const approveDate = new Date(entryDate.getTime() + 2 * 60 * 60 * 1000);
    timeline.push({
      date: approveDate.toISOString(),
      title: "Orçamento Aprovado",
      description: "Orçamento aceito pelo cliente. Reparo técnico iniciado na bancada."
    });
  }

  // 4. Pronto para retirada
  if (step >= 5) {
    const readyDate = os.readyDate ? new Date(os.readyDate) : new Date(entryDate.getTime() + 24 * 60 * 60 * 1000);
    timeline.push({
      date: readyDate.toISOString(),
      title: "Reparo Concluído",
      description: "Equipamento consertado, testado nos testes de estresse e pronto para retirada."
    });
  }

  // 5. Finalizado (Entrega realizada)
  if (step === 6 || os.status === "FINALIZADO") {
    const exitDate = os.exitDate || os.originalExitDate ? new Date(os.exitDate || os.originalExitDate) : new Date();
    timeline.push({
      date: exitDate.toISOString(),
      title: "Equipamento Entregue",
      description: "Equipamento retirado pelo cliente na recepção da MGV com termo de garantia."
    });
  }

  return timeline.reverse(); // Mais recente no topo
}

export class PortalController {
  async getOS(req: Request, res: Response) {
    try {
      const { numero, os: osQuery, cpfCnpj, cpf } = req.query;
      const targetNumber = numero || osQuery;
      const targetCpf = cpfCnpj || cpf;

      if (!targetNumber || !targetCpf) {
        res.status(400).json({ error: "Número da OS e CPF/CNPJ são obrigatórios." });
        return;
      }

      const osNumberStr = String(targetNumber).trim();
      const inputDigits = String(targetCpf).replace(/\D/g, "");

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
        diagnostic: os.laudoMacro || "", // Oculta o diagnostic original (anotação técnica interna) e retorna o laudo macro como "diagnostic" para o cliente
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
      const osNumberInput = req.body.osNumber || req.body.numero;
      const { cpfCnpj, signature } = req.body;
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "UNKNOWN";

      if (!osNumberInput || !cpfCnpj) {
        res.status(400).json({ error: "Número da OS e CPF/CNPJ são obrigatórios." });
        return;
      }

      const inputDigits = String(cpfCnpj).replace(/\D/g, "");

      const os = await prisma.ordemServico.findFirst({
        where: {
          osNumber: String(osNumberInput).trim(),
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
        res.status(400).json({ error: "Esta OS não está aguardando autorização no momento." });
        return;
      }

      const nowFormatted = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const approvalLog = `[Portal do Cliente] Orçamento aprovado eletronicamente em ${nowFormatted} (IP: ${clientIp})${signature ? " [Com Assinatura Digital]" : ""}`;

      // Atualiza o status para EM_MANUTENCAO e registra dados de aceite
      await prisma.ordemServico.update({
        where: { id: os.id },
        data: {
          status: "EM_MANUTENCAO",
          approvedBudgetAmount: os.totalCost,
          clientDecision: "APROVADO",
          diagnostic: os.diagnostic ? `${os.diagnostic}\n${approvalLog}` : approvalLog
        }
      });

      res.json({ message: "Orçamento aprovado com sucesso eletronicamente." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const portalController = new PortalController();
