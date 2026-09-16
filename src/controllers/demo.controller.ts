/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import prisma from "../database/prisma";
import { formatPhoneNumber } from "../services/whatsapp";

export async function createDemoLead(req: Request, res: Response) {
  try {
    const { name, email, phone, companyName, cityState, userCount, source, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "O nome completo é obrigatório." });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: "O número do WhatsApp/telefone é obrigatório." });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      return res.status(400).json({ error: "Número de telefone inválido." });
    }

    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

    const lead = await prisma.demoLead.create({
      data: {
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : "",
        phone: formatPhoneNumber(cleanPhone),
        companyName: companyName ? companyName.trim() : null,
        cityState: cityState ? cityState.trim() : null,
        userCount: userCount ? parseInt(userCount) || 1 : 1,
        notes: notes ? notes.trim() : null,
        source: source || "DEMO_MODAL_FORM",
        ipAddress: clientIp,
      }
    });

    console.log(`[Demo Lead Captured] Novo lead cadastrado: ${lead.name} (${lead.companyName || "Sem empresa"}) - ${lead.phone}`);

    return res.status(201).json({
      success: true,
      message: "Lead cadastrado com sucesso! Um consultor entrará em contato em breve.",
      data: lead
    });
  } catch (err: any) {
    console.error("[Demo Lead Error] Erro ao cadastrar lead:", err);
    return res.status(500).json({ error: "Erro interno ao processar a solicitação da demonstração." });
  }
}

export async function getDemoLeads(req: Request, res: Response) {
  try {
    const { status, search } = req.query;

    const where: any = {};
    if (status && typeof status === "string") {
      where.status = status.toUpperCase();
    }
    if (search && typeof search === "string") {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const leads = await prisma.demoLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return res.json({ success: true, data: leads });
  } catch (err: any) {
    console.error("[Demo Lead Error] Erro ao listar leads:", err);
    return res.status(500).json({ error: "Erro ao buscar a lista de leads." });
  }
}

export async function updateDemoLead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const existingLead = await prisma.demoLead.findUnique({ where: { id } });
    if (!existingLead) {
      return res.status(404).json({ error: "Lead não encontrado." });
    }

    const updated = await prisma.demoLead.update({
      where: { id },
      data: {
        status: status ? status.toUpperCase() : existingLead.status,
        notes: notes !== undefined ? notes : existingLead.notes,
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[Demo Lead Error] Erro ao atualizar lead:", err);
    return res.status(500).json({ error: "Erro ao atualizar informações do lead." });
  }
}
