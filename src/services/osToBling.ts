/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";
import { getAccessToken, syncClientToBling, syncPartToBling } from "./bling";
import { validateFiscalData } from "./nfeService";
import { NFSE_CONFIG } from "../config/fiscal.config";

interface BlingIntegrationResult {
  success: boolean;
  blingId?: string;             // ID do pedido de vendas (Peças)
  notaFiscalId?: string;        // ID da nota fiscal (NF-e/NFC-e)
  servicesBlingId?: string;     // ID do pedido de vendas (Serviços)
  servicesNotaFiscalId?: string; // ID da nota fiscal (NFS-e)
  error?: string;
  warnings?: string[];
}

export async function sendOsToBling(
  os: any,
  client: any,
  partsDb: any[],
  generateNfe: boolean = true,
  extraOptions?: any
): Promise<BlingIntegrationResult> {
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

    const invoiceType = extraOptions?.invoiceType || "bifasico"; // nfe | nfce | nfse | bifasico
    const isNfc = invoiceType === "nfce";
    const isNfse = invoiceType === "nfse";
    const naturezaOperacao = extraOptions?.natureOperation || "Prestação de Serviços";

    // 1. Validação Fiscal Pré-envio
    const validation = validateFiscalData(os, client, partsDb, { isNfc, isNfse });
    if (!validation.isValid) {
      return {
        success: false,
        error: `Falha na validação fiscal: ${validation.errors.join(" | ")}`,
        warnings: validation.warnings
      };
    }

    // 2. Sincronizar Cliente com o Bling
    const contatoId = await syncClientToBling({
      ...client,
      clientId: client.id,
      state: clientState,
      rg: client.rg || undefined,
      stateInscription: extraOptions?.clientStateInscription,
      icmsContribuinteType: extraOptions?.clientIcmsType
    });

    // 3. Separar itens de produtos (peças) e de serviços
    const partsItems: any[] = [];
    const servicesItems: any[] = [];

    if (os.usedParts && os.usedParts.length > 0) {
      for (const item of os.usedParts) {
        const partInDb = partsDb.find((p: any) => p.id === item.partId);
        if (partInDb && !item.isAvulso) {
          const isInterEstadual = clientState !== STORE_STATE;
          const cfopCalculado = isInterEstadual ? partInDb.cfopInterEstadual : partInDb.cfopIntraEstadual;

          const produtoId = await syncPartToBling(partInDb, cfopCalculado, partInDb.cstIcms);
          partsItems.push({
            produto: { id: produtoId },
            quantidade: item.quantity,
            valor: item.price
          });
        } else {
          // Item avulso (Serviço, etc.)
          const categoryCode = item.category || "SERVICO";
          const avulsoCode = `SRV-${categoryCode.toUpperCase()}`;
          const genericAvulsoPart = {
            name: item.name || "Serviço de Manutenção e Calibragem",
            code: avulsoCode,
            price: item.price
          };
          const produtoId = await syncPartToBling(genericAvulsoPart);
          servicesItems.push({
            produto: { id: produtoId },
            quantidade: item.quantity || 1,
            valor: item.price,
            nome: item.name || "Serviço Avulso"
          });
        }
      }
    }

    // Adicionar custos de Mão de Obra
    if (os.laborCost && os.laborCost > 0) {
      const laborPart = {
        name: "Serviço de Manutenção - Mão de Obra",
        code: "SRV-MAO-DE-OBRA",
        price: os.laborCost
      };
      const laborProdutoId = await syncPartToBling(laborPart);
      servicesItems.push({
        produto: { id: laborProdutoId },
        quantidade: 1,
        valor: os.laborCost,
        nome: laborPart.name
      });
    }

    // Adicionar custos de Calibragem
    if (os.calibrationCost && os.calibrationCost > 0) {
      const calibrationPart = {
        name: "Serviço de Calibragem Técnica",
        code: "SRV-CALIBRAGEM",
        price: os.calibrationCost
      };
      const calibrationProdutoId = await syncPartToBling(calibrationPart);
      servicesItems.push({
        produto: { id: calibrationProdutoId },
        quantidade: 1,
        valor: os.calibrationCost,
        nome: calibrationPart.name
      });
    }

    // Caso de Fallback Inteligente se tudo estiver zerado (cria um serviço de manutenção fictício de R$ 870)
    if (partsItems.length === 0 && servicesItems.length === 0) {
      const fallbackValue = (os.totalCost && os.totalCost > 0) ? os.totalCost : (os.laborCost && os.laborCost > 0 ? os.laborCost : 870.0);
      const fallbackPart = {
        name: `Serviço de Calibragem e Manutenção em Assistência Técnica`,
        code: "SRV-CALIBRAGEM-MANUTENCAO",
        price: fallbackValue
      };
      const fallbackProdutoId = await syncPartToBling(fallbackPart);
      servicesItems.push({
        produto: { id: fallbackProdutoId },
        quantidade: 1,
        valor: fallbackValue,
        nome: fallbackPart.name
      });
    }

    // 4. Fluxo de Faturamento com base na escolha (Bifásico ou Simples)
    let finalBlingId: string | undefined;
    let finalNotaFiscalId: string | undefined;
    let finalServicesBlingId: string | undefined;
    let finalServicesNotaFiscalId: string | undefined;
    const errorsList: string[] = [];

    const dateStr = new Date().toISOString().split("T")[0];

    // --- FATURAMENTO DE PRODUTOS / PEÇAS (NF-e ou NFC-e) ---
    if ((invoiceType === "bifasico" || invoiceType === "nfe" || invoiceType === "nfce") && partsItems.length > 0) {
      try {
        const osNumSuffix = invoiceType === "bifasico" ? "-P" : "";
        const numeroPedido = `${os.osNumber.replace("OS-", "")}${osNumSuffix}`;
        const pedidoPayload = {
          contato: { id: contatoId },
          numero: numeroPedido,
          data: dateStr,
          itens: partsItems,
          desconto: os.discount && os.discount > 0 && servicesItems.length === 0 ? {
            valor: os.discount,
            unidade: "VALOR"
          } : undefined,
          observacoes: `Faturamento de Peças. OS Origem: ${os.osNumber}`
        };

        let pedidoId: number | undefined;

        try {
          const pedidoResponse = await axios.post("https://api.bling.com.br/Api/v3/pedidos/vendas", pedidoPayload, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
          });
          pedidoId = pedidoResponse.data?.data?.id;
        } catch (createErr: any) {
          const errCode = createErr.response?.data?.error?.fields?.[0]?.code;
          if (errCode === 36) {
            console.log(`[Bling Sync Peças] Pedido ${numeroPedido} já existe no Bling. Buscando ID existente...`);
            const searchResp = await axios.get("https://api.bling.com.br/Api/v3/pedidos/vendas", {
              headers: { Authorization: `Bearer ${token}` },
              params: { numero: numeroPedido, limite: 1 }
            });
            const pedidos = searchResp.data?.data || [];
            if (pedidos.length > 0) {
              pedidoId = pedidos[0].id;
              console.log(`[Bling Sync Peças] Pedido existente encontrado: ID=${pedidoId}`);
            } else {
              throw new Error(`Pedido ${numeroPedido} já existe no Bling mas não foi encontrado na busca.`);
            }
          } else {
            throw createErr;
          }
        }

        if (!pedidoId) throw new Error("Resposta do Bling não retornou o ID do pedido de peças.");

        finalBlingId = String(pedidoId);
        console.log(`[Bling Sync Peças] Pedido criado/recuperado! ID: ${pedidoId}`);

        if (generateNfe) {
          // NF-e: POST /Api/v3/nfe (endpoint standalone com referência ao pedido)
          // NFC-e: POST /Api/v3/pedidos/vendas/{id}/gerar-nfce (endpoint do pedido)
          let nfResponse: any;

          if (isNfc) {
            // NFC-e continua usando endpoint do pedido
            const nfcPayload = { modelo: 65 };
            nfResponse = await axios.post(
              `https://api.bling.com.br/Api/v3/pedidos/vendas/${pedidoId}/gerar-nfce`,
              nfcPayload,
              { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            );
          } else {
            // NF-e usa endpoint standalone /nfe com pedidoVendaId
            const nfePayload: any = {
              pedidoVendaId: pedidoId,
              tipo: 1 // Saída
            };
            console.log(`[Bling NF-e] Criando NF-e via POST /nfe. Pedido: ${pedidoId}`);
            nfResponse = await axios.post(
              `https://api.bling.com.br/Api/v3/nfe`,
              nfePayload,
              { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            );
          }

          const nfData = nfResponse.data?.data || nfResponse.data;
          finalNotaFiscalId = nfData?.id ? String(nfData.id) : undefined;

          // NFS-e pode retornar 201 (síncrono) ou 202 (assíncrono)
          if (!finalNotaFiscalId && nfData?.flowStatus) {
            console.log(`[Bling NF-e] Processamento assíncrono. Status: ${nfData.flowStatus}`);
            finalNotaFiscalId = `async:${nfData.flowStatus}`;
          }

          console.log(`[Bling NF-e] Sucesso! NF-e ID: ${finalNotaFiscalId || "(async)"}`);
        }
      } catch (err: any) {
        const errData = err.response?.data;
        const errStatus = err.response?.status;
        console.error(`[Bling Sync Peças] Erro HTTP ${errStatus}:`, JSON.stringify(errData || err.message));
        errorsList.push(`Falha no faturamento de Peças (HTTP ${errStatus}): ${errData?.error?.message || err.message}`);
      }
    }

    // --- FATURAMENTO DE SERVIÇOS (NFS-e) ---
    if ((invoiceType === "bifasico" || invoiceType === "nfse") && servicesItems.length > 0) {
      try {
        const osNumSuffix = invoiceType === "bifasico" ? "-S" : "";
        const numeroPedido = `${os.osNumber.replace("OS-", "")}${osNumSuffix}`;
        const pedidoPayload = {
          contato: { id: contatoId },
          numero: numeroPedido,
          data: dateStr,
          itens: servicesItems,
          desconto: os.discount && os.discount > 0 && partsItems.length === 0 ? {
            valor: os.discount,
            unidade: "VALOR"
          } : undefined,
          observacoes: `Faturamento de Serviços/Mão de Obra. OS Origem: ${os.osNumber}`
        };

        let pedidoId: number | undefined;

        try {
          const pedidoResponse = await axios.post("https://api.bling.com.br/Api/v3/pedidos/vendas", pedidoPayload, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
          });
          pedidoId = pedidoResponse.data?.data?.id;
        } catch (createErr: any) {
          const errCode = createErr.response?.data?.error?.fields?.[0]?.code;
          if (errCode === 36) {
            console.log(`[Bling Sync Serviços] Pedido ${numeroPedido} já existe no Bling. Buscando ID existente...`);
            const searchResp = await axios.get("https://api.bling.com.br/Api/v3/pedidos/vendas", {
              headers: { Authorization: `Bearer ${token}` },
              params: { numero: numeroPedido, limite: 1 }
            });
            const pedidos = searchResp.data?.data || [];
            if (pedidos.length > 0) {
              pedidoId = pedidos[0].id;
              console.log(`[Bling Sync Serviços] Pedido existente encontrado: ID=${pedidoId}`);
            } else {
              throw new Error(`Pedido ${numeroPedido} já existe no Bling mas não foi encontrado na busca.`);
            }
          } else {
            throw createErr;
          }
        }

        if (!pedidoId) throw new Error("Resposta do Bling não retornou o ID do pedido de serviços.");

        finalServicesBlingId = String(pedidoId);
        console.log(`[Bling Sync Serviços] Pedido ID: ${pedidoId}, generateNfe: ${generateNfe}, servicesItems: ${servicesItems.length}`);

        if (generateNfe) {
          // NFS-e: POST /Api/v3/nfse
          // Schema: NotasServicosDadosBaseDTO_POST + NotasServicosDadosDTO_POST
          // Required: contato{id,nome,numeroDocumento,email}, servicos[{codigo,descricao,valor}]
          const nfseServiceCode = process.env.BLING_NFSE_SERVICE_CODE || "14.01";
          const nfseServices = servicesItems.map((item: any, idx: number) => ({
            codigo: nfseServiceCode,
            descricao: `${item.nome || NFSE_CONFIG.defaultServiceDescription} - OS: ${os.osNumber}`,
            valor: item.valor * item.quantidade
          }));

          // Contato inline — Bling NFS-e exige numeroDocumento e dados cadastrais inline (passamos o ID e omitimos cpfCnpj para evitar erro de duplicidade)
          const nfseContato: any = {
            id: contatoId,
            nome: client.name,
            email: client.nfeEmail || client.email || ""
          };
          if (client.cpfCnpj) {
            nfseContato.numeroDocumento = client.cpfCnpj;
          }
          if (client.phone) nfseContato.telefone = client.phone;
          if (client.neighborhood || client.city || client.state) {
            nfseContato.endereco = {
              bairro: client.neighborhood || "",
              municipio: client.city || "",
              uf: client.state || process.env.STORE_STATE || "SP"
            };
          }

          // Natureza de Operação (Bling V3 requer o ID numérico cadastrado no painel)
          const envNatureOperationId = process.env.BLING_NATURE_OPERATION_ID;
          const natureOperationId = (extraOptions?.natureOperationId || envNatureOperationId)
            ? parseInt(extraOptions?.natureOperationId || envNatureOperationId)
            : undefined;

          const nfsePayload: any = {
            contato: nfseContato,
            servicos: nfseServices,
            data: dateStr,
            observacoes: `Faturamento de Serviços/Mão de Obra. OS Origem: ${os.osNumber}`
          };

          if (natureOperationId) {
            nfsePayload.naturezaOperacao = { id: natureOperationId };
          }

          console.log(`[Bling NFS-e] Criando NFS-e. Serviços: ${nfseServices.length}, Contato: ${client.name}`);
          console.log(`[Bling NFS-e] Payload:`, JSON.stringify({ ...nfsePayload, contato: { ...nfseContato, endereco: nfseContato.endereco } }, null, 2));

          try {
            const nfResponse = await axios.post("https://api.bling.com.br/Api/v3/nfse", nfsePayload, {
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
            });

            // NFS-e pode retornar 201 (síncrono) ou 202 (assíncrono/processamento)
            const nfData = nfResponse.data?.data || nfResponse.data;
            console.log(`[Bling NFS-e] Resposta Bling:`, JSON.stringify(nfData, null, 2));
            if (nfData?.id) {
              finalServicesNotaFiscalId = String(nfData.id);
              console.log(`[Bling NFS-e] NFS-e criada com sucesso! ID: ${finalServicesNotaFiscalId}`);
            } else if (nfData?.flowStatus) {
              console.log(`[Bling NFS-e] Processamento assíncrono iniciado. Status: ${nfData.flowStatus}`);
              finalServicesNotaFiscalId = `async:${nfData.flowStatus}`;
            }
          } catch (nfseErr: any) {
            const errData = nfseErr.response?.data || nfseErr.message;
            console.error(`[Bling NFS-e] *** ERRO AO CRIAR NFS-e ***`);
            console.error(`[Bling NFS-e] Status HTTP: ${nfseErr.response?.status}`);
            console.error(`[Bling NFS-e] Resposta:`, JSON.stringify(errData, null, 2));
            errorsList.push(`Falha no faturamento de Serviços: ${nfseErr.response?.data?.error?.message || nfseErr.message}`);
          }
        }
      } catch (err: any) {
        console.error("[Bling Sync Serviços] Erro:", JSON.stringify(err.response?.data || err.message, null, 2));
        errorsList.push(`Falha no faturamento de Serviços: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    if (errorsList.length > 0) {
      // Se deu erro em tudo, retorna insucesso
      if (!finalBlingId && !finalServicesBlingId) {
        return {
          success: false,
          error: errorsList.join(" | "),
          warnings: validation.warnings
        };
      }
      // Se deu erro parcial (ex: faturou peças, mas falhou serviço)
      return {
        success: true,
        blingId: finalBlingId,
        notaFiscalId: finalNotaFiscalId,
        servicesBlingId: finalServicesBlingId,
        servicesNotaFiscalId: finalServicesNotaFiscalId,
        error: `Faturamento parcial concluído. Detalhes: ${errorsList.join(" | ")}`,
        warnings: validation.warnings
      };
    }

    return {
      success: true,
      blingId: finalBlingId,
      notaFiscalId: finalNotaFiscalId,
      servicesBlingId: finalServicesBlingId,
      servicesNotaFiscalId: finalServicesNotaFiscalId,
      warnings: validation.warnings
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
