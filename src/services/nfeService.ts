/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isValidCpfOrCnpj } from "../utils/cpfCnpjValidator";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida os dados cadastrais do cliente e os dados fiscais das peças de uma OS para faturamento.
 * 
 * @param os A ordem de serviço a ser validada.
 * @param client O cliente associado à OS.
 * @param partsDb O array de peças no banco de dados para conferência de NCM/tributos.
 * @param options Opções adicionais (como tipo de nota).
 */
export function validateFiscalData(
  os: any,
  client: any,
  partsDb: any[],
  options?: { isNfc?: boolean; isNfse?: boolean }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validação do Cliente
  if (!client) {
    errors.push("Cliente não associado a esta Ordem de Serviço.");
    return { isValid: false, errors, warnings };
  }

  // Validação de Nome/Razão Social
  if (!client.name || client.name.trim().length < 3) {
    errors.push("O nome ou razão social do cliente é inválido ou muito curto.");
  }

  // Validação do Documento (CPF/CNPJ)
  const docResult = isValidCpfOrCnpj(client.cpfCnpj);
  if (!docResult.valid) {
    errors.push(`Documento do cliente inválido (${client.cpfCnpj || "não informado"}). Motivo: ${docResult.message || "Formato inválido"}`);
  }

  // Se for NFC-e ou NFS-e, algumas validações de endereço podem ser alertas em vez de erros bloqueantes.
  const isNfc = !!options?.isNfc;
  const isNfse = !!options?.isNfse;
  const isRelaxed = isNfc || isNfse;
  
  // Validação de Endereço
  if (!client.address || client.address.trim() === "") {
    if (isRelaxed) {
      warnings.push(`Endereço do cliente não informado. Para ${isNfse ? "NFS-e" : "NFC-e"}, o endereço é opcional, mas recomendado.`);
    } else {
      errors.push("O endereço do cliente é obrigatório para emissão de NF-e.");
    }
  }

  if (!client.city || client.city.trim() === "") {
    if (!isRelaxed) errors.push("A cidade do cliente é obrigatória para emissão de NF-e.");
  }

  if (!client.state || client.state.trim() === "") {
    if (!isRelaxed) errors.push("O estado (UF) do cliente é obrigatório para emissão de NF-e.");
  } else if (client.state.trim().length !== 2) {
    errors.push("O estado (UF) do cliente deve conter exatamente 2 caracteres (ex: SP).");
  }

  if (!client.zipCode || client.zipCode.trim() === "") {
    if (!isRelaxed) errors.push("O CEP do cliente é obrigatório para emissão de NF-e.");
  }

  // Validação da Inscrição Estadual (IE) para contribuintes de ICMS
  if (client.cpfCnpj && client.cpfCnpj.replace(/\D/g, "").length === 14) {
    // É pessoa jurídica
    const hasIe = client.stateInscription && client.stateInscription.trim() !== "";
    if (!hasIe) {
      warnings.push("CNPJ sem Inscrição Estadual (IE) informada. A nota será emitida como Não Contribuinte (isento).");
    }
  }

  // 2. Validação dos Itens da OS (Apenas se emitir NF-e ou NFC-e de produtos)
  const isNfseOnly = !!options?.isNfse;
  
  if (!isNfseOnly && os.usedParts && os.usedParts.length > 0) {
    for (const item of os.usedParts) {
      if (item.isAvulso) {
        // Serviços avulsos no meio das peças
        warnings.push(`O item avulso "${item.name}" será faturado. Certifique-se de que ele não representa um serviço tributado por ISS.`);
        continue;
      }

      const partInDb = partsDb.find((p: any) => p.id === item.partId);
      if (!partInDb) {
        errors.push(`Peça utilizada de ID "${item.partId}" não foi encontrada no banco de dados de estoque.`);
        continue;
      }

      // Validação de NCM (Obrigatório e deve ter 8 dígitos numéricos)
      const cleanNcm = partInDb.ncm ? partInDb.ncm.replace(/\D/g, "") : "";
      if (!partInDb.ncm || cleanNcm.length !== 8) {
        errors.push(`A peça "${partInDb.name}" possui NCM inválido ou ausente ("${partInDb.ncm || ""}" ). O NCM deve conter exatamente 8 números.`);
      }

      // Validação de CFOP
      if (!partInDb.cfopIntraEstadual || partInDb.cfopIntraEstadual.trim() === "") {
        errors.push(`A peça "${partInDb.name}" não possui CFOP Intraestadual de saída configurado.`);
      }
      if (!partInDb.cfopInterEstadual || partInDb.cfopInterEstadual.trim() === "") {
        errors.push(`A peça "${partInDb.name}" não possui CFOP Interestadual de saída configurado.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
