/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interface que representa o resultado da conversão de imposto do XML para o BD
 */
export interface TaxConversionResult {
  cfopEntrada: string;
  isST: boolean;
  cfopIntraEstadualSaida: string;
  cfopInterEstadualSaida: string;
  cstIcms: string;
}

/**
 * Avalia o CFOP do fornecedor (XML) e devolve a configuração tributária adequada para a entrada e para as futuras saídas.
 * 
 * @param cfopFornecedor O CFOP encontrado na tag <CFOP> do XML
 * @returns Objeto contendo os CFOPs de entrada, saída e o CSOSN
 */
export function convertXmlCfop(cfopFornecedor: string): TaxConversionResult {
  // Fallbacks padrão caso não se enquadre em regras mapeadas
  let cfopEntrada = "";
  let isST = false;
  let cfopIntraEstadualSaida = "5102";
  let cfopInterEstadualSaida = "6102";
  let cstIcms = "102";

  if (!cfopFornecedor) {
    return { cfopEntrada, isST, cfopIntraEstadualSaida, cfopInterEstadualSaida, cstIcms };
  }

  // Regra 1: Tributado (Compra para Comercialização)
  if (["5101", "5102", "6101", "6102"].includes(cfopFornecedor)) {
    cfopEntrada = cfopFornecedor.startsWith("5") ? "1102" : "2102";
    isST = false;
    cfopIntraEstadualSaida = "5102";
    cfopInterEstadualSaida = "6102";
    cstIcms = "102";
  } 
  // Regra 2: Substituição Tributária (ICMS ST)
  else if (["5401", "5403", "5405", "6401", "6403", "6405"].includes(cfopFornecedor)) {
    cfopEntrada = cfopFornecedor.startsWith("5") ? "1403" : "2403";
    isST = true;
    cfopIntraEstadualSaida = "5405";
    cfopInterEstadualSaida = "6404";
    cstIcms = "500";
  }

  return { cfopEntrada, isST, cfopIntraEstadualSaida, cfopInterEstadualSaida, cstIcms };
}
