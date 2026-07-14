import { Request, Response } from "express";
import prisma from "../database/prisma";
import { eventBus } from "../events";
import { OSStateMachine } from "../domain/os/os.state-machine";
import { OSPolicies } from "../domain/os/os.policies";
import { OSStatus } from "../types";

export class OSController {
  async getAll(req: Request, res: Response) {
    try {
      const activeOS = await prisma.ordemServico.findMany({
        where: { deletedAt: null },
        include: {
          client: true,
          device: true
        }
      });

      res.json(activeOS.map((os: any) => ({
        id: os.id,
        osNumber: os.osNumber,
        clientId: os.clientId,
        deviceId: os.deviceId,
        reportedDefect: os.reportedDefect,
        accessoriesLeft: os.accessoriesLeft,
        physicalState: os.physicalState,
        status: os.status,
        diagnostic: os.diagnostic,
        usedParts: typeof os.usedParts === "string" ? JSON.parse(os.usedParts) : os.usedParts,
        laborCost: os.laborCost,
        totalCost: os.totalCost,
        billingStatus: os.billingStatus,
        blingId: os.blingId,
        blingKey: os.blingKey,
        sefazErrorMessage: os.sefazErrorMessage,
        pdfUrl: os.pdfUrl,
        billingLogs: typeof os.billingLogs === "string" ? JSON.parse(os.billingLogs) : os.billingLogs,
        checklistEntrada: typeof os.checklistEntrada === "string" ? JSON.parse(os.checklistEntrada || "[]") : os.checklistEntrada || [],
        laudoFotos: typeof os.laudoFotos === "string" ? JSON.parse(os.laudoFotos || "[]") : os.laudoFotos || [],
        createdAt: os.createdAt.toISOString(),
        deletedAt: null,
        client: os.client ? { id: os.client.id, name: os.client.name, cpfCnpj: os.client.cpfCnpj, phone: os.client.phone, email: os.client.email, address: os.client.address } : null,
        device: os.device ? { id: os.device.id, type: os.device.type, brand: os.device.brand, model: os.device.model, serialNumber: os.device.serialNumber, description: os.device.description } : null
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    const { clientId, deviceId, reportedDefect, accessoriesLeft, physicalState, checklistEntrada, laudoFotos } = req.body;
    
    if (!clientId || !deviceId || !reportedDefect) {
      res.status(422).json({ error: "O preenchimento do Cliente, Dispositivo e Defeito Relatado é estritamente obrigatório." });
      return;
    }

    try {
      const osCount = await prisma.ordemServico.count();
      const nextSeq = osCount + 1;
      const osNumber = `OS-${String(nextSeq).padStart(4, "0")}`;

      const newOS = await prisma.ordemServico.create({
        data: {
          osNumber,
          clientId,
          deviceId,
          reportedDefect,
          accessoriesLeft: accessoriesLeft || "Nenhum acessório deixado.",
          physicalState: physicalState || "Sem avarias aparentes.",
          status: "ORCAMENTO",
          diagnostic: "",
          usedParts: [],
          laborCost: 0,
          totalCost: 0,
          checklistEntrada: checklistEntrada || [],
          laudoFotos: laudoFotos || [],
          billingStatus: "PENDENTE",
          billingLogs: []
        }
      });

      // Dispara evento de auditoria
      eventBus.emit("OS_CREATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: newOS.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: newOS,
        version: 1
      });

      res.status(201).json({
        ...newOS,
        usedParts: [],
        billingLogs: [],
        checklistEntrada: newOS.checklistEntrada || [],
        laudoFotos: newOS.laudoFotos || [],
        createdAt: newOS.createdAt.toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { diagnostic, usedParts, laborCost, technicianLaborHours, technicianHourlyRate, checklistEntrada, laudoFotos } = req.body;

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      if (currentOS.status === "FINALIZADO" && (checklistEntrada !== undefined || laudoFotos !== undefined)) {
        res.status(400).json({ error: "Não é permitido alterar o laudo fotográfico ou checklist de uma Ordem de Serviço finalizada." });
        return;
      }

      if (usedParts && Array.isArray(usedParts)) {
        const parts = await prisma.part.findMany();
        
        const prevParts: any[] = typeof currentOS.usedParts === "string" ? JSON.parse(currentOS.usedParts) : currentOS.usedParts || [];
        for (const prevItem of prevParts) {
          const part = parts.find((p: any) => p.id === prevItem.partId);
          if (part) {
            await prisma.part.update({
              where: { id: part.id },
              data: { stock: { increment: prevItem.quantity } }
            });
          }
        }

        for (const item of usedParts) {
          const freshPart = await prisma.part.findUnique({ where: { id: item.partId } });
          if (!freshPart) continue;

          if (freshPart.stock < item.quantity) {
            res.status(400).json({ error: `Estoque insuficiente para a peça '${freshPart.name}'. Estoque disponível: ${freshPart.stock}` });
            return;
          }
          await prisma.part.update({
            where: { id: freshPart.id },
            data: { stock: { decrement: item.quantity } }
          });
          
          if (item.costSnapshot === undefined) {
            item.costSnapshot = freshPart.cost || 0;
          }
        }
      }

      const partsTotal = (usedParts || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      const resolvedLaborCost = Number(laborCost) || 0;
      const resolvedTotal = partsTotal + resolvedLaborCost;

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          diagnostic: diagnostic !== undefined ? diagnostic : currentOS.diagnostic,
          usedParts: usedParts !== undefined ? usedParts : currentOS.usedParts,
          laborCost: resolvedLaborCost,
          technicianLaborHours: technicianLaborHours !== undefined ? Number(technicianLaborHours) : currentOS.technicianLaborHours,
          technicianHourlyRate: technicianHourlyRate !== undefined ? Number(technicianHourlyRate) : currentOS.technicianHourlyRate,
          totalCost: resolvedTotal,
          checklistEntrada: checklistEntrada !== undefined ? checklistEntrada : currentOS.checklistEntrada,
          laudoFotos: laudoFotos !== undefined ? laudoFotos : currentOS.laudoFotos
        }
      });

      // Auditoria
      eventBus.emit("OS_UPDATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { old: currentOS, new: updated },
        version: 1
      });

      res.json({
        ...updated,
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateLaudoFotos(req: Request, res: Response) {
    const { id } = req.params;
    const { checklistEntrada, laudoFotos } = req.body;

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      if (currentOS.status === "FINALIZADO") {
        res.status(400).json({ error: "Não é permitido alterar o laudo fotográfico ou checklist de uma Ordem de Serviço finalizada." });
        return;
      }

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          checklistEntrada: checklistEntrada !== undefined ? checklistEntrada : currentOS.checklistEntrada,
          laudoFotos: laudoFotos !== undefined ? laudoFotos : currentOS.laudoFotos
        }
      });

      eventBus.emit("OS_UPDATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { old: currentOS, new: updated },
        version: 1
      });

      res.json({
        ...updated,
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: "Status é obrigatório." });
      return;
    }

    try {
      const currentOS = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!currentOS || currentOS.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      const previousStatus = currentOS.status as OSStatus;
      const targetStatus = status as OSStatus;

      // DDD: Validação de Máquina de Estados Finita (FSM)
      if (!OSStateMachine.canTransition(previousStatus, targetStatus)) {
        res.status(422).json({
          error: `Transição de status inválida: Não é permitido mover de '${previousStatus}' para '${targetStatus}'.`,
          code: "INVALID_STATE_TRANSITION"
        });
        return;
      }

      const osUsedParts = typeof currentOS.usedParts === "string" ? JSON.parse(currentOS.usedParts) : currentOS.usedParts || [];

      if (targetStatus === "FINALIZADO" || targetStatus === "PRONTO_RETIRADA") {
        // DDD: Policy pattern
        const policyCheck = await OSPolicies.canFinishOS(osUsedParts);
        if (!policyCheck.allowed) {
          res.status(422).json({
            error: policyCheck.error,
            code: "SERIAL_REQUIRED",
            missingParts: policyCheck.missingSerials
          });
          return;
        }

        if (!currentOS.diagnostic || currentOS.diagnostic.trim() === "") {
          res.status(422).json({
            error: "Bloqueio: É obrigatório preencher o Laudo Técnico antes de finalizar ou disponibilizar a OS.",
            code: "DIAGNOSTIC_REQUIRED"
          });
          return;
        }
        
        const labor = currentOS.laborCost || 0;
        if (labor === 0 && osUsedParts.length === 0) {
          res.status(422).json({
            error: "Bloqueio: A Ordem de Serviço está sem Custo de Mão de Obra e sem Peças. Preencha os valores no laudo antes de avançar.",
            code: "COST_REQUIRED"
          });
          return;
        }
      }

      const updated = await prisma.ordemServico.update({
        where: { id },
        data: {
          status: targetStatus
        }
      });

      // Emite Evento de Domínio: OS_STATUS_CHANGED
      eventBus.emit("OS_STATUS_CHANGED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { previousStatus, newStatus: targetStatus },
        version: 1
      });

      if (targetStatus === "FINALIZADO" && previousStatus !== "FINALIZADO") {
        const initialLogs = [
          "Status alterado para FINALIZADO.",
          "Iniciando integração de faturamento no Bling síncrono..."
        ];
        
        await prisma.ordemServico.update({
          where: { id },
          data: {
            billingStatus: "PROCESSANDO",
            billingLogs: initialLogs
          }
        });
        
        const clientSnapshot = await prisma.client.findUnique({
          where: { id: updated.clientId }
        });
        const partsDbSnapshot = await prisma.part.findMany();

        import("../services/osToBling").then(async ({ sendOsToBling }) => {
          try {
            const osSnapshot = {
              ...updated,
              status: targetStatus,
              billingStatus: "PROCESSANDO",
              billingLogs: initialLogs,
              usedParts: osUsedParts
            };

            const result = await sendOsToBling(osSnapshot, clientSnapshot, partsDbSnapshot);
            if (result.success) {
              await prisma.ordemServico.update({
                where: { id: updated.id },
                data: {
                  billingStatus: "FATURADO",
                  blingId: result.blingId,
                  sefazErrorMessage: result.error ? result.error : (result.notaFiscalId ? `NF-e gerada com sucesso (ID: ${result.notaFiscalId})` : "Pedido faturado com sucesso no Bling.")
                }
              });
            } else {
              await prisma.ordemServico.update({
                where: { id: updated.id },
                data: {
                  billingStatus: "REJEITADO",
                  sefazErrorMessage: result.error
                }
              });
            }
          } catch (e: any) {
            console.error("[Bling Worker Error]", e);
            await prisma.ordemServico.update({
              where: { id: updated.id },
              data: {
                billingStatus: "REJEITADO",
                sefazErrorMessage: e.message
              }
            });
          }
        });
      }

      res.json({
        ...updated,
        usedParts: typeof updated.usedParts === "string" ? JSON.parse(updated.usedParts) : updated.usedParts,
        billingLogs: typeof updated.billingLogs === "string" ? JSON.parse(updated.billingLogs) : updated.billingLogs,
        checklistEntrada: typeof updated.checklistEntrada === "string" ? JSON.parse(updated.checklistEntrada || "[]") : updated.checklistEntrada || [],
        laudoFotos: typeof updated.laudoFotos === "string" ? JSON.parse(updated.laudoFotos || "[]") : updated.laudoFotos || [],
        createdAt: updated.createdAt.toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const os = await prisma.ordemServico.findUnique({
        where: { id }
      });
      if (!os || os.deletedAt) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada." });
        return;
      }

      await prisma.ordemServico.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      eventBus.emit("OS_DELETED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: os.id,
        aggregateType: "OrdemServico",
        actor: (req as any).user?.id || "SYSTEM",
        payload: os,
        version: 1
      });

      res.json({ message: "Ordem de Serviço excluída (soft delete) com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const osController = new OSController();
