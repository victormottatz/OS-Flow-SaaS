import { Request, Response } from "express";
import prisma from "../database/prisma";
import { isValidCpfOrCnpj } from "../utils/cpfCnpjValidator";

/**
 * SuppliersController — Controlador de CRUD para a gestão de Fornecedores.
 */
export class SuppliersController {
  
  /**
   * Lista todos os fornecedores ativos (deletedAt: null) com suporte a busca textual e paginação.
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const limitParam = req.query.limit as string;
      const search = (req.query.search as string)?.trim().toLowerCase() || "";
      const limit = search ? undefined : (limitParam === "all" ? undefined : (Number(limitParam) || 100));

      const where: any = { deletedAt: null };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { fantasyName: { contains: search, mode: "insensitive" } },
          { cpfCnpj: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } }
        ];
      }

      const [suppliers, total] = await Promise.all([
        prisma.supplier.findMany({
          where,
          include: {
            parts: {
              where: { deletedAt: null }
            }
          },
          take: limit,
          orderBy: { name: "asc" }
        }),
        prisma.supplier.count({ where: { deletedAt: null } })
      ]);

      res.json({
        data: suppliers,
        total
      });
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao buscar fornecedores: " + err.message });
    }
  }

  /**
   * Detalha um único fornecedor por ID.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const supplier = await prisma.supplier.findFirst({
        where: { id, deletedAt: null }
      });

      if (!supplier) {
        res.status(404).json({ error: "Fornecedor não encontrado." });
        return;
      }

      res.json(supplier);
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao buscar detalhes do fornecedor: " + err.message });
    }
  }

  /**
   * Cadastra um novo fornecedor com validação de CNPJ/CPF e duplicidade.
   */
  async create(req: Request, res: Response): Promise<void> {
    const {
      name, fantasyName, cpfCnpj, ie, im, address, neighborhood,
      city, state, zipCode, phone, fax, email, website, contactName, isCarrier, notes
    } = req.body;

    // Nome e CPF/CNPJ são campos obrigatórios essenciais para o cadastro gerencial
    if (!name || !cpfCnpj) {
      res.status(422).json({ error: "Nome (razão social) e CPF/CNPJ são campos obrigatórios." });
      return;
    }

    // Validação formal do formato e dígitos do documento
    const docValidation = isValidCpfOrCnpj(cpfCnpj);
    if (!docValidation.valid) {
      res.status(422).json({ error: docValidation.message || "CPF/CNPJ inválido." });
      return;
    }

    try {
      const cleanDoc = cpfCnpj.replace(/\D/g, "");

      // Verifica se já existe fornecedor ativo com o mesmo documento
      const existing = await prisma.supplier.findFirst({
        where: {
          cpfCnpj: { contains: cleanDoc },
          deletedAt: null
        }
      });

      if (existing) {
        res.status(409).json({ error: "Já existe um fornecedor ativo cadastrado com este CPF/CNPJ." });
        return;
      }

      const supplier = await prisma.supplier.create({
        data: {
          name,
          fantasyName,
          cpfCnpj,
          ie,
          im,
          address,
          neighborhood,
          city,
          state,
          zipCode,
          phone,
          fax,
          email,
          website,
          contactName,
          isCarrier: !!isCarrier,
          notes
        }
      });

      res.status(201).json(supplier);
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao cadastrar fornecedor: " + err.message });
    }
  }

  /**
   * Atualiza as informações de um fornecedor.
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const {
      name, fantasyName, cpfCnpj, ie, im, address, neighborhood,
      city, state, zipCode, phone, fax, email, website, contactName, isCarrier, notes
    } = req.body;

    try {
      const existing = await prisma.supplier.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existing) {
        res.status(404).json({ error: "Fornecedor não encontrado." });
        return;
      }

      // Se alterou o CNPJ/CPF, valida a conformidade e duplicidade
      if (cpfCnpj && cpfCnpj !== existing.cpfCnpj) {
        const docValidation = isValidCpfOrCnpj(cpfCnpj);
        if (!docValidation.valid) {
          res.status(422).json({ error: docValidation.message || "CPF/CNPJ inválido." });
          return;
        }

        const cleanDoc = cpfCnpj.replace(/\D/g, "");
        const duplicate = await prisma.supplier.findFirst({
          where: {
            cpfCnpj: { contains: cleanDoc },
            deletedAt: null,
            NOT: { id }
          }
        });

        if (duplicate) {
          res.status(409).json({ error: "Já existe outro fornecedor ativo cadastrado com este CPF/CNPJ." });
          return;
        }
      }

      const updated = await prisma.supplier.update({
        where: { id },
        data: {
          name: name ?? undefined,
          fantasyName,
          cpfCnpj: cpfCnpj ?? undefined,
          ie,
          im,
          address,
          neighborhood,
          city,
          state,
          zipCode,
          phone,
          fax,
          email,
          website,
          contactName,
          isCarrier: isCarrier !== undefined ? !!isCarrier : undefined,
          notes
        }
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao atualizar fornecedor: " + err.message });
    }
  }

  /**
   * Exclusão lógica (soft delete) do fornecedor no banco.
   */
  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const supplier = await prisma.supplier.findFirst({
        where: { id, deletedAt: null }
      });

      if (!supplier) {
        res.status(404).json({ error: "Fornecedor não encontrado." });
        return;
      }

      // Executa exclusão lógica preenchendo o deletedAt
      await prisma.supplier.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      res.json({ success: true, message: "Fornecedor excluído logicamente com sucesso." });
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao excluir fornecedor: " + err.message });
    }
  }
}
