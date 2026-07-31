import { Request, Response } from "express";
import prisma from "../database/prisma";
import { eventBus, Events } from "../events";
import { getRecurrentAlert } from "./os.controller";
import { isValidCpfOrCnpj } from "../utils/cpfCnpjValidator";

export class ClientsController {
  async getAll(req: Request, res: Response) {
    try {
      const limitParam = req.query.limit as string;
      const search = (req.query.search as string)?.trim().toLowerCase() || "";
      const limit = search ? undefined : (limitParam === "all" ? undefined : (Number(limitParam) || 100));

      const where: any = { deletedAt: null };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { cpfCnpj: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } }
        ];
      }

      const [activeClients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          include: {
            devices: {
              where: { deletedAt: null }
            }
          },
          take: limit
        }),
        prisma.client.count({ where: { deletedAt: null } })
      ]);

      res.json({
        data: activeClients.map(c => ({
          id: c.id,
          name: c.name,
          cpfCnpj: c.cpfCnpj,
          phone: c.phone,
          email: c.email,
          address: c.address,
          city: c.city,
          state: c.state,
          zipCode: c.zipCode,
          rg: c.rg,
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
        })),
        total
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    const { name, cpfCnpj, phone, phone2, email, address, city, state, zipCode, rg, stateInscription, devices } = req.body;
    
    if (!name || !cpfCnpj || !phone || !email || !address) {
      res.status(422).json({ error: "Parâmetros incorretos. Todos os campos de cadastro do cliente são obrigatórios." });
      return;
    }

    const docValidation = isValidCpfOrCnpj(cpfCnpj);
    if (!docValidation.valid) {
      res.status(422).json({ error: docValidation.message || "CPF/CNPJ inválido." });
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
        data: {
          name,
          cpfCnpj,
          phone,
          phone2: phone2 || "",
          email,
          address,
          city: city || "",
          state: state || "",
          zipCode: zipCode || "",
          rg: stateInscription || rg || ""
        }
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
          phone2: client.phone2,
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
    const { name, cpfCnpj, phone, phone2, email, address, city, state, zipCode, stateInscription } = req.body;

    try {
      const client = await prisma.client.findUnique({ where: { id } });
      if (!client || client.deletedAt) {
        res.status(404).json({ error: "Cliente não encontrado." });
        return;
      }

      const docValidation = isValidCpfOrCnpj(cpfCnpj);
      if (!docValidation.valid) {
        res.status(422).json({ error: docValidation.message || "CPF/CNPJ inválido." });
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

      const updateData: any = { name, cpfCnpj, phone, phone2: phone2 || "", email, address };
      if (city !== undefined) updateData.city = city;
      if (state !== undefined) updateData.state = state;
      if (zipCode !== undefined) updateData.zipCode = zipCode;
      if (stateInscription !== undefined) updateData.rg = stateInscription;

      const updated = await prisma.client.update({
        where: { id },
        data: updateData
      });

      const responsePayload = {
        id: updated.id,
        name: updated.name,
        cpfCnpj: updated.cpfCnpj,
        phone: updated.phone,
        phone2: updated.phone2,
        email: updated.email,
        address: updated.address,
        city: updated.city,
        state: updated.state,
        zipCode: updated.zipCode,
        rg: updated.rg,
        deletedAt: null
      };

      eventBus.emit(Events.CLIENT_UPDATED, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        aggregateId: updated.id,
        aggregateType: "Client",
        actor: (req as any).user?.id || "SYSTEM",
        payload: {
          before: {
            name: client.name,
            cpfCnpj: client.cpfCnpj,
            phone: client.phone,
            phone2: client.phone2,
            email: client.email,
            address: client.address,
            city: client.city,
            state: client.state,
            zipCode: client.zipCode,
            rg: client.rg
          },
          after: {
            name: updated.name,
            cpfCnpj: updated.cpfCnpj,
            phone: updated.phone,
            phone2: updated.phone2,
            email: updated.email,
            address: updated.address,
            city: updated.city,
            state: updated.state,
            zipCode: updated.zipCode,
            rg: updated.rg
          }
        },
        version: 1
      });

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

      const parsedOrders = await Promise.all(orders.map(async (o: any) => ({
        ...o,
        usedParts: typeof o.usedParts === "string" ? JSON.parse(o.usedParts) : o.usedParts || [],
        billingLogs: typeof o.billingLogs === "string" ? JSON.parse(o.billingLogs) : o.billingLogs || [],
        checklistEntrada: typeof o.checklistEntrada === "string" ? JSON.parse(o.checklistEntrada || "[]") : o.checklistEntrada || [],
        laudoFotos: typeof o.laudoFotos === "string" ? JSON.parse(o.laudoFotos || "[]") : o.laudoFotos || [],
        recurrent: o.recurrent,
        recurrentAlert: await getRecurrentAlert(o)
      })));

      res.json({
        client: {
          id: client.id,
          legacyId: client.legacyId,
          name: client.name,
          cpfCnpj: client.cpfCnpj,
          phone: client.phone,
          phone2: client.phone2,
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

  async consultCNPJ(req: Request, res: Response) {
    const { cnpj } = req.params;
    const cleanCnpj = cnpj.replace(/\D/g, "");
    
    if (cleanCnpj.length !== 14) {
      res.status(400).json({ error: "CNPJ inválido. Deve conter 14 dígitos." });
      return;
    }

    try {
      const { default: axios } = await import("axios");
      const response = await axios.get(`https://receitaws.com.br/v1/cnpj/${cleanCnpj}`);
      
      if (response.data.status === "ERROR") {
        res.status(400).json({ error: response.data.message || "Erro ao consultar CNPJ." });
        return;
      }

      const data = response.data;
      res.json({
        name: data.nome || "",
        fantasy: data.fantasia || "",
        address: `${data.logradouro || ""}, ${data.numero || ""}${data.complemento ? ` - ${data.complemento}` : ""}`,
        bairro: data.bairro || "",
        city: data.municipio || "",
        state: data.uf || "",
        zipCode: data.cep ? data.cep.replace(/\D/g, "") : ""
      });
    } catch (err: any) {
      console.error("Erro ao consultar CNPJ:", err.message);
      res.status(500).json({ error: "Erro ao consultar CNPJ na Receitaws." });
    }
  }
}

export const clientsController = new ClientsController();
