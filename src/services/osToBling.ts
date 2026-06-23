/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { getAccessToken, syncClientToBling, syncPartToBling } from "./bling";

interface BlingIntegrationResult {
  success: boolean;
  blingId?: string;
  notaFiscalId?: string;
  error?: string;
}

export async function sendOsToBling(os: any, client: any, partsDb: any[]): Promise<BlingIntegrationResult> {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error("Não foi possível obter um token válido para o Bling.");
    }

    if (!client) {
      throw new Error("Cliente não encontrado para esta Ordem de Serviço.");
    }

    // 1. Sync Client
    const contatoId = await syncClientToBling(client);

    // 2. Prepare items
    const itens = [];

    // Sync parts
    if (os.usedParts && os.usedParts.length > 0) {
      for (const item of os.usedParts) {
        const partInDb = partsDb.find((p: any) => p.id === item.partId);
        if (partInDb) {
          const produtoId = await syncPartToBling(partInDb);
          itens.push({
            produto: { id: produtoId },
            quantidade: item.quantity,
            valor: item.price
          });
        } else {
          // Fallback se não estiver no partsDb (improvável, mas seguro)
          itens.push({
            descricao: item.name,
            quantidade: item.quantity,
            valor: item.price
          });
        }
      }
    }

    // Add labor cost (Mão de Obra) se houver
    if (os.laborCost && os.laborCost > 0) {
      const laborPart = {
        name: "Serviço de Manutenção - Mão de Obra",
        code: "SRV-MAO-DE-OBRA",
        price: os.laborCost
      };
      const laborProdutoId = await syncPartToBling(laborPart);
      itens.push({
        produto: { id: laborProdutoId },
        quantidade: 1,
        valor: os.laborCost
      });
    }

    if (itens.length === 0) {
      throw new Error("A Ordem de Serviço não possui peças nem valor de mão de obra para faturamento.");
    }

    // 3. Create Pedido de Venda
    const pedidoPayload = {
      contato: { id: contatoId },
      numero: os.osNumber.replace("OS-", ""),
      data: new Date().toISOString().split("T")[0],
      itens: itens
    };

    const pedidoResponse = await axios.post("https://api.bling.com.br/Api/v3/pedidos/vendas", pedidoPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const pedidoId = pedidoResponse.data?.data?.id;
    if (!pedidoId) {
      throw new Error("Resposta do Bling não retornou o ID do pedido criado.");
    }

    // 4. Generate NF-e
    // Tenta gerar a nota fiscal a partir do pedido de venda
    const nfPayload = {
      tipo: 1, // Saída
      pedidoVenda: { id: pedidoId }
    };
    
    let notaFiscalId = null;
    try {
      const nfResponse = await axios.post("https://api.bling.com.br/Api/v3/notas-fiscais", nfPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      notaFiscalId = nfResponse.data?.data?.id;
    } catch (nfError: any) {
      console.error("[Bling Sync NF-e] Erro ao gerar nota:", nfError.response?.data || nfError.message);
      let errorMsg = nfError.message;
      if (nfError.response?.data?.error) {
         errorMsg = JSON.stringify(nfError.response.data.error);
      }
      return {
        success: true,
        blingId: String(pedidoId),
        error: `Pedido de venda gerado no Bling, mas a Nota Fiscal foi rejeitada: ${errorMsg}`
      };
    }

    return {
      success: true,
      blingId: String(pedidoId),
      notaFiscalId: notaFiscalId ? String(notaFiscalId) : undefined
    };

  } catch (error: any) {
    console.error("[Bling Sync Error] sendOsToBling:", error.response?.data || error.message);
    let apiError = error.message;
    if (error.response?.data?.error?.message) {
      apiError = error.response.data.error.message;
    } else if (error.response?.data?.error) {
      apiError = JSON.stringify(error.response.data.error);
    }
    return {
      success: false,
      error: typeof apiError === "string" ? apiError : JSON.stringify(apiError)
    };
  }
}
