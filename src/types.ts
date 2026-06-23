/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  address: string;
  deletedAt?: string | null;
}

export interface Device {
  id: string;
  clientId: string;
  type: string; // ex: Computador, Impressora
  brand: string;
  model: string;
  serialNumber: string; // "Sem Série" ou "N/D" permitido
  description: string; // características físicas para rastreabilidade
  deletedAt?: string | null;
}

export type OSStatus = 'ORCAMENTO' | 'AGUARDANDO_PECA' | 'EM_MANUTENCAO' | 'PRONTO_RETIRADA' | 'FINALIZADO';

export interface Part {
  id: string;
  name: string;
  code: string;
  stock: number;
  cost: number;
  price: number;
}

export interface UsedPart {
  partId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrdemServico {
  id: string;
  osNumber: string; // Ex: OS-0001
  clientId: string;
  deviceId: string;
  reportedDefect: string;
  accessoriesLeft: string;
  physicalState: string;
  status: OSStatus;
  diagnostic?: string;
  usedParts: UsedPart[];
  laborCost: number;
  totalCost: number;
  
  // Faturamento e Integração Bling
  billingStatus: 'PENDENTE' | 'PROCESSANDO' | 'FATURADO' | 'REJEITADO' | 'TIMEOUT';
  blingId?: string;
  blingKey?: string;
  sefazErrorMessage?: string;
  pdfUrl?: string;
  billingLogs?: string[];
  
  deletedAt?: string | null;
  createdAt: string;
}
