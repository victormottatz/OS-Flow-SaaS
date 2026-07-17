import { Request, Response } from "express";
import prisma from "../database/prisma";
import { eventBus, Events } from "../events";

export class PartsController {
  async getAll(req: Request, res: Response) {
    try {
      const limitParam = req.query.limit as string;
      const limit = limitParam === "all" ? undefined : (Number(limitParam) || 100);

      const activeParts = await prisma.part.findMany({
        where: { deletedAt: null },
        orderBy: {
          createdAt: "desc"
        },
        take: limit
      });
      res.json(activeParts.map(p => ({
        ...p,
        createdAt: p.createdAt?.toISOString() || undefined,
        deletedAt: null
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    const { name, code, sku, barcode, stock, stockMin, cost, price, requiresSerial, supplier, location } = req.body;
    
    if (!name || !code || stock === undefined || cost === undefined || price === undefined) {
      res.status(400).json({ error: "Os campos Nome, Código, Estoque, Custo e Preço são obrigatórios." });
      return;
    }

    try {
      const codeExists = await prisma.part.findFirst({
        where: { code, deletedAt: null }
      });
      if (codeExists) {
        res.status(409).json({ error: `Já existe uma peça ativa com o código '${code}'.` });
        return;
      }

      const newPart = await prisma.part.create({
        data: {
          name,
          code,
          sku: sku || null,
          barcode: barcode || null,
          stock: parseInt(stock) || 0,
          stockMin: parseInt(stockMin) || 0,
          cost: parseFloat(cost) || 0.0,
          price: parseFloat(price) || 0.0,
          requiresSerial: !!requiresSerial,
          supplier: supplier || null,
          location: location || null
        }
      });

      // Dispara evento de auditoria
      eventBus.emit("PART_CREATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: newPart.id,
        aggregateType: "Part",
        actor: (req as any).user?.id || "SYSTEM",
        payload: newPart,
        version: 1
      });

      res.status(201).json(newPart);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, code, sku, barcode, stock, stockMin, cost, price, requiresSerial, supplier, location } = req.body;

    try {
      const part = await prisma.part.findUnique({ where: { id } });
      if (!part || part.deletedAt) {
        res.status(404).json({ error: "Peça não encontrada." });
        return;
      }

      if (code) {
        const codeExists = await prisma.part.findFirst({
          where: { id: { not: id }, code, deletedAt: null }
        });
        if (codeExists) {
          res.status(409).json({ error: `Já existe outra peça ativa com o código '${code}'.` });
          return;
        }
      }

      const updatedPart = await prisma.part.update({
        where: { id },
        data: {
          name: name !== undefined ? name : part.name,
          code: code !== undefined ? code : part.code,
          sku: sku !== undefined ? sku : part.sku,
          barcode: barcode !== undefined ? barcode : part.barcode,
          stock: stock !== undefined ? parseInt(stock) : part.stock,
          stockMin: stockMin !== undefined ? parseInt(stockMin) : part.stockMin,
          cost: cost !== undefined ? parseFloat(cost) : part.cost,
          price: price !== undefined ? parseFloat(price) : part.price,
          requiresSerial: requiresSerial !== undefined ? !!requiresSerial : part.requiresSerial,
          supplier: supplier !== undefined ? supplier : part.supplier,
          location: location !== undefined ? location : part.location
        }
      });

      // Dispara evento de auditoria
      eventBus.emit("PART_UPDATED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updatedPart.id,
        aggregateType: "Part",
        actor: (req as any).user?.id || "SYSTEM",
        payload: { old: part, new: updatedPart },
        version: 1
      });

      res.json(updatedPart);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const part = await prisma.part.findUnique({ where: { id } });
      if (!part || part.deletedAt) {
        res.status(404).json({ error: "Peça não encontrada." });
        return;
      }

      await prisma.part.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      // Dispara evento de auditoria
      eventBus.emit("PART_DELETED" as any, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: id,
        aggregateType: "Part",
        actor: (req as any).user?.id || "SYSTEM",
        payload: part,
        version: 1
      });

      res.json({ message: "Peça excluída (soft delete) com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const partsController = new PartsController();
