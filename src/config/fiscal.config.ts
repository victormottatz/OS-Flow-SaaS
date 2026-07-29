/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parametrização Fiscal Oficial (NFS-e Padrão Nacional / Bring)
 * MGV Tecnologia e Assistência Técnica
 * Fonte: Orientação Contec Contábil (28/07/2026)
 */
export const NFSE_CONFIG = {
  /** Tipo de Operação no sistema */
  operationType: "Prestação de Serviços",

  /** Alíquota efetiva atual do ISS no Simples Nacional (%) */
  issRate: 4.01,

  /** Código de Serviço NBS (LC 116) - Serviços de Manutenção e Reparação */
  nbsCode: "120029000",

  /** Código Base NBS no Padrão Nacional */
  nbsBaseCode: "00",

  /** Situação Tributária PIS/COFINS (01 = PIS/COFINS Não Retidos, opção "00 - Nenhum") */
  pisCofinsTaxStatus: "01",

  /** Valor Aproximado dos Tributos para a Lei da Transparência (%) */
  transparencyTaxRate: 6.00,

  /** Descrição padrão da atividade de serviços */
  defaultServiceDescription: "Serviços de manutenção e reparação de equipamentos",
} as const;

export type NfseConfig = typeof NFSE_CONFIG;
