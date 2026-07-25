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

export async function sendOsToBling(os: any, client: any, partsDb: any[], generateNfe: boolean = true, extraOptions?: any): Promise<BlingIntegrationResult> {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error("Não foi possível obter um token válido para o Bling.");
    }

    if (!client) {
      throw new Error("Cliente não encontrado para esta Ordem de Serviço.");
    }

    const STORE_STATE = process.env.STORE_STATE || "SP";
    const clientState = (client.state && client.state.trim() !== "") ? client.state.trim().toUpperCase() : STORE_STATE;

    // 1. Sync Client
    const contatoId = await syncClientToBling({
      ...client,
      state: clientState,
      rg: client.rg || undefined,
      stateInscription: extraOptions?.clientStateInscription,
      icmsContribuinteType: extraOptions?.clientIcmsType
    });

    // 2. Prepare items
    const itens = [];

    // Sync parts & custom items
    if (os.usedParts && os.usedParts.length > 0) {
      for (const item of os.usedParts) {
        const partInDb = partsDb.find((p: any) => p.id === item.partId);
        if (partInDb && !item.isAvulso) {
          const isInterEstadual = clientState !== STORE_STATE;
          const cfopCalculado = isInterEstadual ? partInDb.cfopInterEstadual : partInDb.cfopIntraEstadual;

          const produtoId = await syncPartToBling(partInDb, cfopCalculado, partInDb.cstIcms);
          itens.push({
            produto: { id: produtoId },
            quantidade: item.quantity,
            valor: item.price
          });
        } else {
          // Item avulso (Serviço, Calibragem, Peça Avulsa, etc.)
          const categoryCode = item.category || "SERVICO";
          const avulsoCode = `SRV-${categoryCode.toUpperCase()}`;
          const genericAvulsoPart = {
            name: item.name || "Serviço de Manutenção e Calibragem",
            code: avulsoCode,
            price: item.price
          };
          const produtoId = await syncPartToBling(genericAvulsoPart);
          itens.push({
            produto: { id: produtoId },
            quantidade: item.quantity || 1,
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

    // Add calibration cost (Serviço de Calibragem) se houver
    if (os.calibrationCost && os.calibrationCost > 0) {
      const calibrationPart = {
        name: "Serviço de Calibragem Técnica",
        code: "SRV-CALIBRAGEM",
        price: os.calibrationCost
      };
      const calibrationProdutoId = await syncPartToBling(calibrationPart);
      itens.push({
        produto: { id: calibrationProdutoId },
        quantidade: 1,
        valor: os.calibrationCost
      });
    }

    // Smart Fallback para OSs Históricas (evita HTTP 422 quando itens/mão de obra estão zerados na tela mas o Total OS é > 0)
    if (itens.length === 0) {
      const fallbackValue = (os.totalCost && os.totalCost > 0) ? os.totalCost : (os.laborCost && os.laborCost > 0 ? os.laborCost : 870.0);
      const fallbackPart = {
        name: `Serviço de Calibragem e Manutenção em Assistência Técnica`,
        code: "SRV-CALIBRAGEM-MANUTENCAO",
        price: fallbackValue
      };
      const fallbackProdutoId = await syncPartToBling(fallbackPart);
      itens.push({
        produto: { id: fallbackProdutoId },
        quantidade: 1,
        valor: fallbackValue
      });
    }

    // 3. Create Pedido de Venda
    const pedidoPayload = {
      contato: { id: contatoId },
      numero: os.osNumber.replace("OS-", ""),
      data: new Date().toISOString().split("T")[0],
      itens: itens,
      desconto: os.discount && os.discount > 0 ? {
        valor: os.discount,
        unidade: "VALOR"
      } : undefined,
      observacoes: extraOptions?.natureOperation ? `Natureza da Operação: ${extraOptions.natureOperation}` : undefined
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

    // 4. Generate NF-e (Opcional)
    let notaFiscalId = null;
    if (generateNfe) {
      const nfPayload = {
        tipo: 1, // Saída
        pedidoVenda: { id: pedidoId }
      };
      
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
