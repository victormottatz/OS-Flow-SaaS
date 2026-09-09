/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import prisma from "../database/prisma";
import { checkPermission } from "../middlewares/auth";
import { DOCUMENT_TEMPLATES } from "../config/documents.config";
import { buildDocumentPdf } from "../services/pdfService";

const router = Router();

/** Tenta converter colunas JSON que o Prisma pode devolver como string (padrão dos controllers). */
function safeJsonArray(value: any): any[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
}

/**
 * Gera um PDF real no servidor para o template informado (termo, orcamento, recibo).
 *
 * POST /api/documents/pdf/:templateId
 * Body: { osId: string; dataEmissao?: string }
 */
router.post("/pdf/:templateId", checkPermission("os.view"), async (req, res) => {
  try {
    const { templateId } = req.params;
    const { osId, dataEmissao } = req.body || {};

    if (!osId) {
      res.status(400).json({ error: "osId é obrigatório." });
      return;
    }

    // Whitelist estrita: DOCUMENT_TEMPLATES é um objeto simples, então o lookup
    // direto aceitaria chaves de prototype ("toString", "__proto__") — use hasOwn.
    if (!Object.hasOwn(DOCUMENT_TEMPLATES, templateId)) {
      res.status(400).json({ error: `Template de documento inválido: ${templateId}.` });
      return;
    }
    const template = DOCUMENT_TEMPLATES[templateId as keyof typeof DOCUMENT_TEMPLATES];

    const os = await prisma.ordemServico.findUnique({
      where: { id: osId },
      include: { 
        client: true, 
        device: true,
        company: true
      }
    });

    if (!os || os.deletedAt) {
      res.status(404).json({ error: "Ordem de Serviço não encontrada." });
      return;
    }

    // Normaliza colunas que o Prisma pode devolver como string JSON (mesmo padrão
    // dos controllers) — evita quebra do getDocumentTotal (.filter em string).
    const osData: any = {
      ...os,
      usedParts: safeJsonArray(os.usedParts),
      checklistEntrada: safeJsonArray(os.checklistEntrada)
    };

    // Monta informações white-label da assistência do tenant se disponível
    const companyInfo = os.company ? {
      razaoSocial: os.company.name,
      cnpj: os.company.cnpj ? `CNPJ: ${os.company.cnpj}` : undefined,
      endereco: [os.company.address, os.company.city, os.company.state].filter(Boolean).join(" - "),
      phone: os.company.phone || undefined,
      logoBase64: os.company.logoUrl || undefined
    } : undefined;

    const buffer = await buildDocumentPdf(template, osData, dataEmissao, companyInfo);
    // Defesa extra: garante Buffer nativo antes do res.send (o Express serializa
    // objetos como JSON, mesmo com Content-Type application/pdf já definido).
    const raw: Buffer = Buffer.isBuffer(buffer)
      ? buffer
      : Buffer.from(
          (buffer as any) && (buffer as any).type === "Buffer" && Array.isArray((buffer as any).data)
            ? (buffer as any).data
            : (buffer as any)
        );
    const filename = `${template.nomeArquivo}-${os.osNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", raw.length);
    res.send(raw);
  } catch (err: any) {
    console.error("[PDF Service Error]", err);
    res.status(500).json({ error: err.message || "Erro ao gerar o PDF." });
  }
});

export default router;
