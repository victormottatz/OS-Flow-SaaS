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
  sku?: string;
  barcode?: string;
  stock: number;
  stockMin?: number;
  cost: number;
  price: number;
  requiresSerial?: boolean; // Flag: peças de alto valor exigem nº de série na OS
  supplier?: string;
  location?: string; // Localização física (ex: Prateleira A3)
  notaFiscalEntradaId?: string | null; // Preparado para fase 2 (importação via XML NF-e)
  deletedAt?: string | null;
  createdAt?: string;
}

export interface UsedPart {
  partId: string;
  name: string;
  quantity: number;
  price: number;
  costSnapshot?: number; // Snapshot do custo no momento da alocação (proteção contra inflação)
  serialNumber?: string; // Nº de série da peça instalada (obrigatório se Part.requiresSerial = true)
}

export interface ChecklistItem {
  id: string;          // ex: 'tela', 'carcaca', 'teclado'
  label: string;       // ex: 'Tela / Display'
  status: 'OK' | 'AVARIA' | 'NA'; // N/A = Não Aplicável
  observacao?: string; // nota livre por item
}

export interface EntradaFoto {
  id: string;
  dataUrl: string;     // Base64 da imagem comprimida
  legenda?: string;    // Descrição da foto
  capturedAt: string;  // ISO timestamp
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
  technicianLaborHours?: number;
  technicianHourlyRate?: number;
  totalCost: number;
  
  // Checklist de Entrada e Laudo Fotográfico
  checklistEntrada?: ChecklistItem[];
  laudoFotos?: EntradaFoto[];
  
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

