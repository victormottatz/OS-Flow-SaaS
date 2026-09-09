import { Request, Response } from "express";
import prisma from "../database/prisma";
import { eventBus, Events } from "../events";

export class PartsController {
  async getAll(req: Request, res: Response) {
    try {
      const limitParam = req.query.limit as string;
      const search = (req.query.search as string)?.trim().toLowerCase() || "";
      const limit = search ? undefined : (limitParam === "all" ? undefined : (Number(limitParam) || 100));

      const where: any = { deletedAt: null };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
          { barcode: { contains: search, mode: "insensitive" } }
        ];
      }

      // Consulta de todas as partes para calcular o valor total global em estoque
      const allActivePartsCountAndSum = await prisma.part.findMany({
        where: { deletedAt: null },
        select: {
          stock: true,
          cost: true,
          stockMin: true,
          requiresSerial: true
        }
      });

      let globalLowStockCount = 0;
      let globalSerializedCount = 0;
      let globalTotalStockValue = 0;

      for (const p of allActivePartsCountAndSum) {
        if (p.stock <= (p.stockMin || 0)) {
          globalLowStockCount++;
        }
        if (p.requiresSerial) {
          globalSerializedCount++;
        }
        globalTotalStockValue += (p.cost || 0) * (p.stock || 0);
      }

      const activeParts = await prisma.part.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        take: limit
      });

      res.json({
        data: activeParts.map(p => ({
          ...p,
          createdAt: p.createdAt?.toISOString() || undefined,
          deletedAt: null
        })),
        total: allActivePartsCountAndSum.length,
        stats: {
          lowStockCount: globalLowStockCount,
          serializedCount: globalSerializedCount,
          totalStockValue: globalTotalStockValue
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const part = await prisma.part.findUnique({
        where: { id, deletedAt: null }
      });
      if (!part) {
        res.status(404).json({ error: "Peça não encontrada no estoque." });
        return;
      }
      res.json(part);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    const { name, code, sku, barcode, stock, stockMin, cost, price, requiresSerial, supplier, location,
      unit, gtin, ncm, cest, manufacturerCode, manufacturer, cnpjFab, partGroup, partSubgroup,
      weightGross, weightNet, cstOrigem, cstIcms, icmsAliq, icmsStAliq, icmsRedBc,
      cfopIntraEstadual, cfopInterEstadual, ipiAliq, ipiEnquadramento, pisAliq, cofinsAliq,
      totalTributos, cBenef, indEscala, bcStRetido, icmsStRetido, aliqSt, icmsSubstituto,
      redBcEfet, bcEfet, icmsEfetAliq, icmsEfetValor
    } = req.body;
    
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
          location: location || null,
          unit: unit || "UN",
          gtin: gtin || null,
          ncm: ncm || null,
          cest: cest || null,
          manufacturerCode: manufacturerCode || null,
          manufacturer: manufacturer || null,
          cnpjFab: cnpjFab || null,
          partGroup: partGroup || null,
          partSubgroup: partSubgroup || null,
          weightGross: parseFloat(weightGross) || 0.0,
          weightNet: parseFloat(weightNet) || 0.0,
          cstOrigem: (cstOrigem !== undefined && cstOrigem !== null && cstOrigem !== "") ? String(cstOrigem) : "0",
          cstIcms: (cstIcms !== undefined && cstIcms !== null && cstIcms !== "") ? String(cstIcms) : "000",
          icmsAliq: parseFloat(icmsAliq) || 0.0,
          icmsStAliq: parseFloat(icmsStAliq) || 0.0,
          icmsRedBc: parseFloat(icmsRedBc) || 100.0,
          cfopIntraEstadual: cfopIntraEstadual ? String(cfopIntraEstadual) : "5102",
          cfopInterEstadual: cfopInterEstadual ? String(cfopInterEstadual) : "6102",
          ipiAliq: parseFloat(ipiAliq) || 0.0,
          ipiEnquadramento: ipiEnquadramento ? String(ipiEnquadramento) : "999",
          pisAliq: parseFloat(pisAliq) || 0.0,
          cofinsAliq: parseFloat(cofinsAliq) || 0.0,
          totalTributos: parseFloat(totalTributos) || 0.0,
          cBenef: cBenef || null,
          indEscala: indEscala ? String(indEscala) : "S",
          bcStRetido: parseFloat(bcStRetido) || 0.0,
          icmsStRetido: parseFloat(icmsStRetido) || 0.0,
          aliqSt: parseFloat(aliqSt) || 0.0,
          icmsSubstituto: parseFloat(icmsSubstituto) || 0.0,
          redBcEfet: parseFloat(redBcEfet) || 0.0,
          bcEfet: parseFloat(bcEfet) || 0.0,
          icmsEfetAliq: parseFloat(icmsEfetAliq) || 0.0,
          icmsEfetValor: parseFloat(icmsEfetValor) || 0.0,
          companyId: (req as any).companyId || (req.headers["x-company-id"] as string) || null
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
    const { name, code, sku, barcode, stock, stockMin, cost, price, requiresSerial, supplier, location,
      unit, gtin, ncm, cest, manufacturerCode, manufacturer, cnpjFab, partGroup, partSubgroup,
      weightGross, weightNet, cstOrigem, cstIcms, icmsAliq, icmsStAliq, icmsRedBc,
      cfopIntraEstadual, cfopInterEstadual, ipiAliq, ipiEnquadramento, pisAliq, cofinsAliq,
      totalTributos, cBenef, indEscala, bcStRetido, icmsStRetido, aliqSt, icmsSubstituto,
      redBcEfet, bcEfet, icmsEfetAliq, icmsEfetValor
    } = req.body;

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
          location: location !== undefined ? location : part.location,
          unit: unit !== undefined ? unit : part.unit,
          gtin: gtin !== undefined ? gtin : part.gtin,
          ncm: ncm !== undefined ? ncm : part.ncm,
          cest: cest !== undefined ? cest : part.cest,
          manufacturerCode: manufacturerCode !== undefined ? manufacturerCode : part.manufacturerCode,
          manufacturer: manufacturer !== undefined ? manufacturer : part.manufacturer,
          cnpjFab: cnpjFab !== undefined ? cnpjFab : part.cnpjFab,
          partGroup: partGroup !== undefined ? partGroup : part.partGroup,
          partSubgroup: partSubgroup !== undefined ? partSubgroup : part.partSubgroup,
          weightGross: weightGross !== undefined ? parseFloat(weightGross) : part.weightGross,
          weightNet: weightNet !== undefined ? parseFloat(weightNet) : part.weightNet,
          cstOrigem: cstOrigem !== undefined ? cstOrigem : part.cstOrigem,
          cstIcms: cstIcms !== undefined ? cstIcms : part.cstIcms,
          icmsAliq: icmsAliq !== undefined ? parseFloat(icmsAliq) : part.icmsAliq,
          icmsStAliq: icmsStAliq !== undefined ? parseFloat(icmsStAliq) : part.icmsStAliq,
          icmsRedBc: icmsRedBc !== undefined ? parseFloat(icmsRedBc) : part.icmsRedBc,
          cfopIntraEstadual: cfopIntraEstadual !== undefined ? cfopIntraEstadual : part.cfopIntraEstadual,
          cfopInterEstadual: cfopInterEstadual !== undefined ? cfopInterEstadual : part.cfopInterEstadual,
          ipiAliq: ipiAliq !== undefined ? parseFloat(ipiAliq) : part.ipiAliq,
          ipiEnquadramento: ipiEnquadramento !== undefined ? ipiEnquadramento : part.ipiEnquadramento,
          pisAliq: pisAliq !== undefined ? parseFloat(pisAliq) : part.pisAliq,
          cofinsAliq: cofinsAliq !== undefined ? parseFloat(cofinsAliq) : part.cofinsAliq,
          totalTributos: totalTributos !== undefined ? parseFloat(totalTributos) : part.totalTributos,
          cBenef: cBenef !== undefined ? cBenef : part.cBenef,
          indEscala: indEscala !== undefined ? indEscala : part.indEscala,
          bcStRetido: bcStRetido !== undefined ? parseFloat(bcStRetido) : part.bcStRetido,
          icmsStRetido: icmsStRetido !== undefined ? parseFloat(icmsStRetido) : part.icmsStRetido,
          aliqSt: aliqSt !== undefined ? parseFloat(aliqSt) : part.aliqSt,
          icmsSubstituto: icmsSubstituto !== undefined ? parseFloat(icmsSubstituto) : part.icmsSubstituto,
          redBcEfet: redBcEfet !== undefined ? parseFloat(redBcEfet) : part.redBcEfet,
          bcEfet: bcEfet !== undefined ? parseFloat(bcEfet) : part.bcEfet,
          icmsEfetAliq: icmsEfetAliq !== undefined ? parseFloat(icmsEfetAliq) : part.icmsEfetAliq,
          icmsEfetValor: icmsEfetValor !== undefined ? parseFloat(icmsEfetValor) : part.icmsEfetValor
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
