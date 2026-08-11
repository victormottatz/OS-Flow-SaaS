import { Request, Response } from "express";
import prisma from "../database/prisma";

export const getCustomFields = async (req: Request, res: Response) => {
  try {
    const fields = await prisma.customField.findMany({
      where: { deletedAt: null },
      orderBy: [{ entityType: 'asc' }, { order: 'asc' }]
    });
    res.json(fields);
  } catch (error) {
    console.error("Erro ao buscar custom fields:", error);
    res.status(500).json({ error: "Erro interno ao buscar campos personalizados" });
  }
};

export const createCustomField = async (req: Request, res: Response) => {
  try {
    const { entityType, label, type, options, required, order } = req.body;
    
    if (!entityType || !label || !type) {
      return res.status(400).json({ error: "Entity type, label e type são obrigatórios." });
    }

    const field = await prisma.customField.create({
      data: {
        entityType,
        label,
        type,
        options: options || [],
        required: required || false,
        order: order || 0
      }
    });

    res.status(201).json(field);
  } catch (error) {
    console.error("Erro ao criar custom field:", error);
    res.status(500).json({ error: "Erro interno ao criar campo personalizado" });
  }
};

export const updateCustomField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, type, options, required, order } = req.body;

    const field = await prisma.customField.update({
      where: { id },
      data: {
        label,
        type,
        options,
        required,
        order
      }
    });

    res.json(field);
  } catch (error) {
    console.error("Erro ao atualizar custom field:", error);
    res.status(500).json({ error: "Erro interno ao atualizar campo personalizado" });
  }
};

export const deleteCustomField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.customField.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true, message: "Campo removido com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir custom field:", error);
    res.status(500).json({ error: "Erro interno ao excluir campo personalizado" });
  }
};
