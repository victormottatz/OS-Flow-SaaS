/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  OWNER = 'OWNER',         // Dono/Administrador (Acesso Total)
  ADMIN = 'ADMIN',         // Administrador
  SUPERVISOR = 'SUPERVISOR',// Supervisor de Oficina
  EDITOR = 'EDITOR',       // Editor genérico (legado)
  ATTENDANT = 'ATTENDANT', // Recepção/Atendimento
  TECHNICIAN = 'TECHNICIAN',// Laboratório/Técnico
  FINANCIAL = 'FINANCIAL'  // Financeiro/Faturamento
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
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
  warrantyExpiresAt?: string | null;
  lastMaintenanceAt?: string | null;
}

export type OSStatus = 'AGUARDANDO_AVALIACAO' | 'AGUARDANDO_AUTORIZACAO' | 'AGUARDANDO_PECA' | 'EM_MANUTENCAO' | 'PRONTO_RETIRADA' | 'PAGO_PRONTO_RETIRADA' | 'FINALIZADO';

export type OSClosingReason =
  | 'REPARO_CONCLUIDO'
  | 'ORCAMENTO_RECUSADO'
  | 'DESCARTE_CLIENTE_RETIRA'
  | 'DESCARTE_OFICINA';

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

export type AvulsoCategory = 'PECA' | 'SERVICO' | 'TAXA' | 'FRETE' | 'DESCONTO' | 'OUTROS';

export interface UsedPart {
  id?: string; // ID único para a listagem (especialmente útil para itens avulsos)
  partId?: string; // Tornou-se opcional, pois itens avulsos não têm partId
  isAvulso?: boolean;
  category?: AvulsoCategory;
  name: string;
  quantity: number;
  price: number;
  costSnapshot?: number; // Snapshot do custo no momento da alocação ou custo do item avulso
  serialNumber?: string; // Nº de série da peça instalada
  observation?: string; // Observações para itens avulsos (ex: "Comprado especificamente para esta OS")
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
  laudoMacro?: string;
  usedParts: UsedPart[];
  laborCost: number;
  technicianLaborHours?: number;
  technicianHourlyRate?: number;
  totalCost: number;
  
  // Checklist de Entrada e Laudo Fotográfico
  checklistEntrada?: ChecklistItem[];
  checklistSaida?: ChecklistItem[];
  laudoFotos?: EntradaFoto[];
  
  // Faturamento e Integração Bling
  billingStatus: 'PENDENTE' | 'PROCESSANDO' | 'FATURADO' | 'REJEITADO' | 'TIMEOUT';
  blingId?: string;
  blingKey?: string;
  sefazErrorMessage?: string;
  pdfUrl?: string;
  billingLogs?: string[];
  
  deletedAt?: string | null;
  stressTestStartedAt?: string | null;
  stressTestStartedBy?: string | null;
  createdAt: string;
  originalExitDate?: string | null;
  closingReason?: OSClosingReason | null;
  client?: Client | null;
  device?: Device | null;

  // Rentabilidade (Virtual / Computado no backend para OWNER)
  profitValue?: number | null;
  profitMarginPercent?: number | null;
  hasZeroCostParts?: boolean;

  // Motor de Recorrência (Virtual / Computado no backend)
  recurrentAlert?: { count: number; previousOsNumbers: string[] } | null;
}

