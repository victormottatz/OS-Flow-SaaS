import { Request, Response } from "express";
import prisma from "../database/prisma";
import { OSStateMachine } from "../domain/os/os.state-machine";
import { OSPolicies } from "../domain/os/os.policies";
import { OSStatus } from "../types";

export class PortalController {
  async getOS(req: Request, res: Response) {
    try {
      const { numero, cpfCnpj } = req.query;

      if (!numero || !cpfCnpj) {
        res.status(400).json({ error: "Número da OS e últimos 4 dígitos do documento são obrigatórios." });
        return;
      }

      const osNumberStr = String(numero).trim();
      const documentSuffix = String(cpfCnpj).replace(/\D/g, "").slice(-4);

      if (documentSuffix.length !== 4) {
        res.status(400).json({ error: "Forneça os 4 últimos dígitos válidos do CPF/CNPJ." });
        return;
      }

      const os = await prisma.ordemServico.findFirst({
        where: {
          osNumber: osNumberStr,
          deletedAt: null,
          client: {
            cpfCnpj: {
              endsWith: documentSuffix
            }
          }
        },
        include: {
          client: {
            select: {
              name: true,
              phone: true
            }
          },
          device: {
            select: {
              brand: true,
              model: true,
              serialNumber: true,
              type: true
            }
          }
        }
      });

      if (!os) {
        res.status(404).json({ error: "Ordem de Serviço não encontrada ou dados divergentes." });
        return;
      }

      // Hide internal data
      const publicOS = {
        id: os.id,
        osNumber: os.osNumber,
        status: os.status,
        reportedDefect: os.reportedDefect,
        diagnostic: os.diagnostic,
        laborCost: os.laborCost,
        totalCost: os.totalCost,
        createdAt: os.createdAt,
        client: os.client,
        device: os.device,
        usedParts: os.usedParts
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

      const documentSuffix = String(cpfCnpj).replace(/\D/g, "").slice(-4);

      const os = await prisma.ordemServico.findFirst({
        where: {
          osNumber: String(osNumber),
          deletedAt: null,
          client: {
            cpfCnpj: {
              endsWith: documentSuffix
            }
          }
        }
      });

      if (!os) {
        res.status(404).json({ error: "OS não encontrada ou dados inválidos." });
        return;
      }

      // Validar transição usando a FSM estática
      if (!OSStateMachine.canTransition(os.status as OSStatus, "EM_MANUTENCAO")) {
        res.status(400).json({ error: "Esta OS não pode ser aprovada neste momento." });
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
