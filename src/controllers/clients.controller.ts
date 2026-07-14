import { Request, Response } from "express";
import prisma from "../database/prisma";
import { eventBus, Events } from "../events";

export class ClientsController {
  async getAll(req: Request, res: Response) {
    try {
      const activeClients = await prisma.client.findMany({
        where: { deletedAt: null },
        include: {
          devices: {
            where: { deletedAt: null }
          }
        }
      });

      res.json(activeClients.map(c => ({
        id: c.id,
        name: c.name,
        cpfCnpj: c.cpfCnpj,
        phone: c.phone,
        email: c.email,
        address: c.address,
        deletedAt: null,
        devices: c.devices.map(d => ({
          id: d.id,
          clientId: d.clientId,
          type: d.type,
          brand: d.brand,
          model: d.model,
          serialNumber: d.serialNumber,
          description: d.description,
          deletedAt: null
        }))
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    const { name, cpfCnpj, phone, email, address, devices } = req.body;
    
    if (!name || !cpfCnpj || !phone || !email || !address) {
      res.status(422).json({ error: "Parâmetros incorretos. Todos os campos de cadastro do cliente são obrigatórios." });
      return;
    }

    try {
      const activeClients = await prisma.client.findMany({
        where: { deletedAt: null }
      });
      const isDuplicate = activeClients.some(c => c.cpfCnpj.replace(/\D/g, '') === cpfCnpj.replace(/\D/g, ''));
      if (isDuplicate) {
        res.status(409).json({ error: "CPF/CNPJ duplicado. Já existe um cliente ativo cadastrado com este documento." });
        return;
      }

      const client = await prisma.client.create({
        data: { name, cpfCnpj, phone, email, address }
      });

      const insertedDevices: any[] = [];
      if (devices && Array.isArray(devices)) {
        for (const dev of devices) {
          const serialNo = dev.serialNumber?.trim() ? dev.serialNumber.trim() : "Sem Série";
          
          const newDev = await prisma.device.create({
            data: {
              clientId: client.id,
              type: dev.type || "Outro",
              brand: dev.brand || "Generico",
              model: dev.model || "N/A",
              serialNumber: serialNo,
              description: dev.description || "Nenhuma especificação gravada.",
            }
          });
          insertedDevices.push(newDev);
        }
      }

      const responsePayload = {
        client: {
          id: client.id,
          name: client.name,
          cpfCnpj: client.cpfCnpj,
          phone: client.phone,
          email: client.email,
          address: client.address,
          deletedAt: null
        },
        devices: insertedDevices
      };

      // Dispara evento de auditoria
      eventBus.emit(Events.CLIENT_CREATED, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: client.id,
        aggregateType: "Client",
        actor: (req as any).user?.id || "SYSTEM",
        payload: responsePayload,
        version: 1
      });

      res.status(201).json(responsePayload);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, cpfCnpj, phone, email, address } = req.body;

    try {
      const client = await prisma.client.findUnique({ where: { id } });
      if (!client || client.deletedAt) {
        res.status(404).json({ error: "Cliente não encontrado." });
        return;
      }

      const activeClients = await prisma.client.findMany({ where: { deletedAt: null } });
      const isDuplicate = activeClients.some(
        c => c.id !== id && c.cpfCnpj.replace(/\D/g, '') === cpfCnpj.replace(/\D/g, '')
      );
      if (isDuplicate) {
        res.status(409).json({ error: "CPF/CNPJ duplicado. Já existe outro cliente cadastrado com este documento." });
        return;
      }

      const updated = await prisma.client.update({
        where: { id },
        data: { name, cpfCnpj, phone, email, address }
      });

      const responsePayload = {
        id: updated.id,
        name: updated.name,
        cpfCnpj: updated.cpfCnpj,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        deletedAt: null
      };

      // TODO: Registrar evento de auditoria `CLIENT_UPDATED` aqui no eventBus

      res.json(responsePayload);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const client = await prisma.client.findUnique({ where: { id } });
      if (!client || client.deletedAt) {
        res.status(404).json({ error: "Cliente não encontrado." });
        return;
      }

      const deletedTime = new Date();

      await prisma.$transaction([
        prisma.client.update({
          where: { id },
          data: { deletedAt: deletedTime }
        }),
        prisma.device.updateMany({
          where: { clientId: id },
          data: { deletedAt: deletedTime }
        }),
        prisma.ordemServico.updateMany({
          where: { clientId: id },
          data: { deletedAt: deletedTime }
        })
      ]);

      res.json({ message: "Cliente e vínculos excluídos (soft delete) com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async get360(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const client = await prisma.client.findUnique({ where: { id } });
      if (!client || client.deletedAt) {
        res.status(404).json({ error: "Cliente não encontrado." });
        return;
      }

      const devices = await prisma.device.findMany({
        where: { clientId: id, deletedAt: null }
      });

      const orders = await prisma.ordemServico.findMany({
        where: { clientId: id, deletedAt: null },
        include: { device: true },
        orderBy: { createdAt: "desc" }
      });

      const finishedOrders = orders.filter(
        (o: any) => o.status === "FINALIZADO" || o.status === "PRONTO_RETIRADA"
      );
      const totalSpent = finishedOrders.reduce((sum: number, o: any) => sum + (o.totalCost || 0), 0);

      const parsedOrders = orders.map((o: any) => ({
        ...o,
        usedParts: typeof o.usedParts === "string" ? JSON.parse(o.usedParts) : o.usedParts || [],
        billingLogs: typeof o.billingLogs === "string" ? JSON.parse(o.billingLogs) : o.billingLogs || [],
        checklistEntrada: typeof o.checklistEntrada === "string" ? JSON.parse(o.checklistEntrada || "[]") : o.checklistEntrada || [],
        laudoFotos: typeof o.laudoFotos === "string" ? JSON.parse(o.laudoFotos || "[]") : o.laudoFotos || []
      }));

      res.json({
        client: {
          id: client.id,
          legacyId: client.legacyId,
          name: client.name,
          cpfCnpj: client.cpfCnpj,
          phone: client.phone,
          email: client.email,
          address: client.address,
          createdAt: (client as any).createdAt
        },
        devices,
        orders: parsedOrders,
        totalSpent
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const clientsController = new ClientsController();
