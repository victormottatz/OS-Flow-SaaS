import { Request, Response } from "express";
import prisma from "../database/prisma";
import { eventBus, Events } from "../events";

export class DevicesController {
  async create(req: Request, res: Response) {
    const { clientId, type, brand, model, serialNumber, description } = req.body;
    
    if (!clientId || !type || !brand || !model) {
      res.status(422).json({ error: "Parâmetros incorretos. Cliente, Tipo, Marca e Modelo são obrigatórios." });
      return;
    }

    try {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client || client.deletedAt) {
        res.status(404).json({ error: "Cliente não encontrado." });
        return;
      }

      const newDev = await prisma.device.create({
        data: {
          clientId,
          type,
          brand,
          model,
          serialNumber: serialNumber || "Sem Série",
          description: description || "Nenhuma especificação gravada."
        }
      });

      // Dispara evento de auditoria
      eventBus.emit("DEVICE_CREATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: newDev.id,
        aggregateType: "Device",
        actor: (req as any).user?.id || "SYSTEM",
        payload: newDev,
        version: 1
      });

      res.status(201).json(newDev);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { type, brand, model, serialNumber, description } = req.body;

    try {
      const device = await prisma.device.findUnique({ where: { id } });
      if (!device || device.deletedAt) {
        res.status(404).json({ error: "Equipamento não encontrado." });
        return;
      }

      const updated = await prisma.device.update({
        where: { id },
        data: {
          type: type !== undefined ? type : device.type,
          brand: brand !== undefined ? brand : device.brand,
          model: model !== undefined ? model : device.model,
          serialNumber: serialNumber !== undefined ? serialNumber : device.serialNumber,
          description: description !== undefined ? description : device.description
        }
      });

      // Dispara evento de auditoria
      eventBus.emit("DEVICE_UPDATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "Device",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { old: device, new: updated },
        version: 1
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getProntuario(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const device = await prisma.device.findUnique({
        where: { id },
        include: {
          client: true,
          orders: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" }
          },
          notes: {
            orderBy: { createdAt: "desc" }
          }
        }
      });
      if (!device || device.deletedAt) {
        res.status(404).json({ error: "Equipamento não encontrado." });
        return;
      }

      const parsedOrders = device.orders.map((o: any) => ({
        ...o,
        usedParts: typeof o.usedParts === "string" ? JSON.parse(o.usedParts) : o.usedParts || [],
        billingLogs: typeof o.billingLogs === "string" ? JSON.parse(o.billingLogs) : o.billingLogs || [],
        checklistEntrada: typeof o.checklistEntrada === "string" ? JSON.parse(o.checklistEntrada || "[]") : o.checklistEntrada || [],
        laudoFotos: typeof o.laudoFotos === "string" ? JSON.parse(o.laudoFotos || "[]") : o.laudoFotos || []
      }));

      res.json({
        ...device,
        orders: parsedOrders
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getNotes(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const notes = await prisma.deviceNote.findMany({
        where: { deviceId: id },
        orderBy: { createdAt: "desc" }
      });
      res.json(notes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async createNote(req: Request, res: Response) {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      res.status(400).json({ error: "O conteúdo da nota é obrigatório." });
      return;
    }

    try {
      const device = await prisma.device.findUnique({ where: { id } });
      if (!device || device.deletedAt) {
        res.status(404).json({ error: "Equipamento não encontrado." });
        return;
      }

      const newNote = await prisma.deviceNote.create({
        data: {
          deviceId: id,
          content,
          createdBy: (req as any).user?.id || "SYSTEM"
        }
      });

      res.status(201).json(newNote);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateWarranty(req: Request, res: Response) {
    const { id } = req.params;
    const { warrantyExpiresAt, lastMaintenanceAt } = req.body;
    try {
      const device = await prisma.device.findUnique({ where: { id } });
      if (!device || device.deletedAt) {
        res.status(404).json({ error: "Equipamento não encontrado." });
        return;
      }

      const updated = await prisma.device.update({
        where: { id },
        data: {
          warrantyExpiresAt: warrantyExpiresAt ? new Date(warrantyExpiresAt) : device.warrantyExpiresAt,
          lastMaintenanceAt: lastMaintenanceAt ? new Date(lastMaintenanceAt) : device.lastMaintenanceAt
        }
      });

      // Dispara evento de auditoria
      eventBus.emit("DEVICE_UPDATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "Device",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { old: device, new: updated },
        version: 1
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.deviceCategory.findMany({
        orderBy: { name: "asc" }
      });
      res.json(categories.map((c: any) => ({
        ...c,
        defaultChecklist: typeof c.defaultChecklist === "string"
          ? JSON.parse(c.defaultChecklist)
          : c.defaultChecklist || [],
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async createCategory(req: Request, res: Response) {
    const { name, defaultChecklist } = req.body;
    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: "Nome da categoria é obrigatório (mín. 2 caracteres)." });
      return;
    }

    try {
      const category = await prisma.deviceCategory.create({
        data: {
          name: name.trim(),
          defaultChecklist: defaultChecklist || [],
        }
      });
      res.status(201).json({
        ...category,
        defaultChecklist: typeof category.defaultChecklist === "string"
          ? JSON.parse(category.defaultChecklist)
          : category.defaultChecklist || [],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const devicesController = new DevicesController();
