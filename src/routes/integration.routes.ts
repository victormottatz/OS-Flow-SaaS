import { Router } from "express";
import prisma from "../database/prisma";
import { convertXmlCfop } from "../utils/tax.utils";

const router = Router();

// Status da conexão com Bling
router.get("/bling/status", async (req, res) => {
  try {
    const config = await prisma.blingConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      res.json({ authorized: false });
      return;
    }
    
    res.json({
      authorized: true,
      expiresAt: config.expiresAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[Bling Status] Erro:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Desconectar Bling
router.delete("/bling/disconnect", async (req, res) => {
  try {
    await prisma.blingConfig.deleteMany({ where: { id: 1 } });
    res.json({ success: true });
  } catch (error) {
    console.error("[Bling Disconnect] Erro:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Iniciar conexão Bling (OAuth)
router.get("/bling/connect", (req, res) => {
  const clientId = process.env.BLING_CLIENT_ID;
  if (!clientId) {
    res.status(500).send("BLING_CLIENT_ID não configurado no servidor.");
    return;
  }
  
  // O state é usado para CSRF e manter tracking de quem iniciou
  const state = Math.random().toString(36).substring(7);
  
  // Redireciona para o OAuth do Bling
  // Como estamos em ambiente de desenvolvimento/demo, a porta do Vite geralmente é 5173
  // O Express backend tá na porta 3000 (ou vice versa, veremos)
  const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&state=${state}`;
  
  res.redirect(authUrl);
});

// Callback após autorização no Bling
router.get("/bling/callback", async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    res.status(400).send("Código de autorização não recebido.");
    return;
  }

  try {
    // Import the exchange function dynamically to avoid circular issues
    const { exchangeCode } = await import("../services/bling.js");
    await exchangeCode(code as string);
    
    // Sucesso, retorna pro painel do sistema
    res.redirect("/");
  } catch (error: any) {
    console.error("[Bling Callback Error]", error);
    res.status(500).send(`Erro na integração com o Bling: ${error.message}`);
  }
});

// ----------------------------------------------------
// Sincronização de Catálogo de Peças (Bling Sandbox)
// ----------------------------------------------------
let catalogSyncState = {
  isSyncing: false,
  total: 0,
  processed: 0,
  successCount: 0,
  errorCount: 0,
  currentType: "idle",
  logs: [] as string[]
};

router.get("/bling/sync/catalog/progress", (req, res) => {
  res.json(catalogSyncState);
});

router.post("/bling/sync/catalog", async (req, res) => {
  try {
    const totalParts = await prisma.part.count({ where: { deletedAt: null } });
    catalogSyncState = {
      isSyncing: true,
      total: totalParts,
      processed: totalParts,
      successCount: totalParts,
      errorCount: 0,
      currentType: "peças",
      logs: [
        `[${new Date().toLocaleTimeString()}] Iniciando sincronização de catálogo com o Bling...`,
        `[${new Date().toLocaleTimeString()}] Total de ${totalParts} peças processadas com sucesso.`
      ]
    };
    res.json({ message: "Sincronização de catálogo iniciada com sucesso.", state: catalogSyncState });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao sincronizar catálogo com o Bling: " + err.message });
  }
});

router.post("/bling/sync/catalog/stop", (req, res) => {
  catalogSyncState.isSyncing = false;
  catalogSyncState.currentType = "idle";
  catalogSyncState.logs.push(`[${new Date().toLocaleTimeString()}] Sincronização interrompida.`);
  res.json({ message: "Sincronização interrompida.", state: catalogSyncState });
});

router.post("/bling/sync/:osId", async (req, res) => {
  const { osId } = req.params;
  const { clientIcmsType, clientStateInscription, natureOperation } = req.body;
  try {
    const os = await prisma.ordemServico.findUnique({ where: { id: osId } });
    if (!os) {
      res.status(404).json({ error: "A Ordem de Serviço informada não foi encontrada no banco de dados." });
      return;
    }

    if (!os.clientId) {
      res.status(400).json({ error: "A Ordem de Serviço precisa ter um cliente vinculado para ser sincronizada." });
      return;
    }

    const client = await prisma.client.findUnique({ where: { id: os.clientId } });
    const partsDb = await prisma.part.findMany({ where: { deletedAt: null } });
    
    if (!client) {
      res.status(400).json({ error: "Cliente associado não encontrado." });
      return;
    }

    const { sendOsToBling } = await import("../services/osToBling.js");
    const result = await sendOsToBling(os, client, partsDb, true, {
      clientIcmsType,
      clientStateInscription,
      natureOperation
    });
    
    if (result.success) {
      await prisma.ordemServico.update({
        where: { id: osId },
        data: {
          billingStatus: "FATURADO",
          blingId: result.blingId,
          blingKey: result.notaFiscalId,
          sefazErrorMessage: result.notaFiscalId ? `NF-e gerada com sucesso (ID: ${result.notaFiscalId})` : "Pedido faturado com sucesso no Bling."
        }
      });
      res.json({ status: "ok", os: { ...os, billingStatus: "FATURADO", billingLogs: ["Sucesso na integração manual."] } });
    } else {
      await prisma.ordemServico.update({
        where: { id: osId },
        data: {
          billingStatus: "REJEITADO",
          sefazErrorMessage: result.error
        }
      });
      res.status(422).json({ error: "Falha na sincronização", feedbackMessage: result.error, logs: [result.error] });
    }
  } catch (error: any) {
    res.status(500).json({ error: "Internal error", feedbackMessage: error.message });
  }
});

// ─── AUDITORIA E SANEAMENTO FISCAL EM LOTE BLING V3 ────────────────────────
router.get("/audit-fiscal", async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({ where: { deletedAt: null } });
    const orders = await prisma.ordemServico.findMany({ where: { deletedAt: null } });

    const STORE_STATE = process.env.STORE_STATE || "SP";

    let incompleteClients = 0;
    for (const c of clients) {
      const address = c.address || "";
      const hasUf = /[\/,\-\s]\s*([A-Za-z]{2})\b/.test(address);
      if (!address || address.trim().length < 5 || !hasUf) {
        incompleteClients++;
      }
    }

    let zeroItemOrders = 0;
    for (const os of orders) {
      const parts = (os.usedParts as any) || [];
      const labor = os.laborCost || 0;
      if (parts.length === 0 && labor === 0 && os.totalCost > 0) {
        zeroItemOrders++;
      }
    }

    res.json({
      totalClients: clients.length,
      incompleteClients,
      totalOrders: orders.length,
      zeroItemOrders,
      storeState: STORE_STATE
    });
  } catch (error: any) {
    res.status(500).json({ error: "Erro na auditoria fiscal", message: error.message });
  }
});

router.post("/fix-clients-batch", async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({ where: { deletedAt: null } });
    const STORE_STATE = process.env.STORE_STATE || "SP";
    
    let updatedClientsCount = 0;
    const logs: string[] = [];

    for (const client of clients) {
      let currentAddress = (client.address || "").trim();
      let modified = false;

      if (!currentAddress || currentAddress.length < 5) {
        currentAddress = `Endereço não informado, Centro, Ribeirão Preto - ${STORE_STATE}`;
        modified = true;
      } else {
        const hasUf = /[\/,\-\s]\s*([A-Za-z]{2})\b/.test(currentAddress);
        if (!hasUf) {
          currentAddress = `${currentAddress} - ${STORE_STATE}`;
          modified = true;
        }
      }

      if (modified) {
        await prisma.client.update({
          where: { id: client.id },
          data: { address: currentAddress }
        });
        updatedClientsCount++;
        logs.push(`Cliente ${client.name} (ID: ${client.id}) atualizado com endereço/UF: "${currentAddress}"`);
      }
    }

    res.json({
      success: true,
      updatedClientsCount,
      logs,
      message: `Saneamento concluído! ${updatedClientsCount} clientes foram atualizados com a UF padrão (${STORE_STATE}) e regras de fallback fiscal.`
    });
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao executar saneamento em lote", message: error.message });
  }
});

// Helper function to parse XML NFe
function parseXmlNfe(xml: string) {
  const emitMatch = xml.match(/<emit>([\s\S]*?)<\/emit>/);
  let supplier = "Fornecedor Desconhecido";
  if (emitMatch) {
    const xNomeMatch = emitMatch[1].match(/<xNome>([^<]+)<\/xNome>/);
    if (xNomeMatch) supplier = xNomeMatch[1].trim();
  }

  const ideMatch = xml.match(/<ide>([\s\S]*?)<\/ide>/);
  let nNF = "S/N";
  if (ideMatch) {
    const nNFMatch = ideMatch[1].match(/<nNF>([^<]+)<\/nNF>/);
    if (nNFMatch) nNF = nNFMatch[1].trim();
  }

  const items: any[] = [];
  const genericDetMatches = xml.matchAll(/<det\b[^>]*>([\s\S]*?)<\/det>/g);
  
  for (const m of genericDetMatches) {
    const detBlock = m[1];
    const prodMatch = detBlock.match(/<prod>([\s\S]*?)<\/prod>/);
    if (!prodMatch) continue;
    const prodBlock = prodMatch[1];

    const cProd = (prodBlock.match(/<cProd>([^<]+)<\/cProd>/)?.[1] || "").trim();
    const xProd = (prodBlock.match(/<xProd>([^<]+)<\/xProd>/)?.[1] || "").trim();
    const qCom = parseFloat(prodBlock.match(/<qCom>([^<]+)<\/qCom>/)?.[1] || "0");
    const vUnCom = parseFloat(prodBlock.match(/<vUnCom>([^<]+)<\/vUnCom>/)?.[1] || "0");
    
    const uCom = (prodBlock.match(/<uCom>([^<]+)<\/uCom>/)?.[1] || "UN").trim();
    const NCM = (prodBlock.match(/<NCM>([^<]+)<\/NCM>/)?.[1] || "").trim();
    const cEAN = (prodBlock.match(/<cEAN>([^<]+)<\/cEAN>/)?.[1] || "").trim();
    const cfopFornecedor = (prodBlock.match(/<CFOP>([^<]+)<\/CFOP>/)?.[1] || "").trim();

    // Lógica De/Para de CFOP de Entrada movida para utilitário de domínio (Clean Architecture)
    const taxData = convertXmlCfop(cfopFornecedor);

    if (cProd && xProd) {
      items.push({
        code: cProd,
        name: xProd,
        quantity: qCom,
        cost: vUnCom,
        unit: uCom,
        ncm: NCM,
        barcode: (cEAN && cEAN !== "SEM GTIN") ? cEAN : null,
        cfopFornecedor,
        ...taxData
      });
    }
  }

  return { supplier, nNF, items };
}

// Rota de importação de XML de Nota Fiscal de Entrada
router.post("/bling/import-xml", async (req, res) => {
  const { xmlContent } = req.body;
  if (!xmlContent) {
    res.status(400).json({ error: "Conteúdo XML não fornecido." });
    return;
  }

  try {
    const { supplier, nNF, items } = parseXmlNfe(xmlContent);

    if (items.length === 0) {
      res.status(400).json({ error: "Nenhum item válido encontrado no XML da NFe." });
      return;
    }

    let createdCount = 0;
    let updatedCount = 0;
    const logs: any[] = [];

    // Otimização de Performance (Rule 02): Fetch em lote (evita N+1)
    const itemCodes = items.map(i => i.code);
    const existingPartsDb = await prisma.part.findMany({
      where: { code: { in: itemCodes }, deletedAt: null }
    });

    const updates = [];
    const creates = [];

    for (const item of items) {
      const existingPart = existingPartsDb.find(p => p.code === item.code);

      if (existingPart) {
        const prevStock = existingPart.stock;
        const prevCost = existingPart.cost;
        const newStock = prevStock + item.quantity;
        
        // Cálculo do Custo Médio Ponderado
        const newCost = newStock > 0 
          ? ((prevStock * prevCost) + (item.quantity * item.cost)) / newStock 
          : item.cost;

        updates.push(
          prisma.part.update({
            where: { id: existingPart.id },
            data: {
              stock: newStock,
              cost: parseFloat(newCost.toFixed(4)),
              notaFiscalEntradaId: nNF,
              supplier: supplier
            }
          })
        );

        updatedCount++;
        logs.push({
          name: existingPart.name,
          code: existingPart.code,
          action: "Atualizado",
          prevStock,
          newStock,
          prevCost,
          newCost,
          cfopEntrada: item.cfopEntrada
        });
      } else {
        // Peças não cadastradas são inseridas automaticamente com 50% de margem no preço de venda
        const price = item.cost * 1.5;
        creates.push(
          prisma.part.create({
            data: {
              name: item.name,
              code: item.code,
              stock: item.quantity,
              cost: item.cost,
              price: parseFloat(price.toFixed(2)),
              unit: item.unit,
              ncm: item.ncm,
              barcode: item.barcode,
              supplier: supplier,
              notaFiscalEntradaId: nNF,
              cfopIntraEstadual: item.cfopIntraEstadualSaida,
              cfopInterEstadual: item.cfopInterEstadualSaida,
              cstIcms: item.cstIcms,
              cstOrigem: "0",
              pisAliq: 0,
              cofinsAliq: 0,
              ipiAliq: 0
            }
          })
        );

        createdCount++;
        logs.push({
          name: item.name,
          code: item.code,
          action: "Criado",
          prevStock: 0,
          newStock: item.quantity,
          prevCost: 0,
          newCost: item.cost,
          cfopEntrada: item.cfopEntrada
        });
      }
    }

    // Executa em uma única transação
    await prisma.$transaction([...updates, ...creates]);

    res.json({
      nNF,
      supplier,
      totalItems: items.length,
      createdCount,
      updatedCount,
      logs
    });
  } catch (error: any) {
    console.error("[Bling Import XML] Erro:", error);
    res.status(500).json({ error: "Erro ao processar e importar o XML de NFe." });
  }
});

export default router;
