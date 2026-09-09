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
  companyId?: string | null;
  company?: {
    id: string;
    name: string;
    slug?: string;
    logoUrl?: string | null;
    subscription?: any;
  } | null;
}

export type TagScope = 'GLOBAL' | 'CLIENT' | 'DEVICE' | 'ORDEM_SERVICO';

export interface Tag {
  id: string;
  name: string;
  colorHex: string;
  scope?: TagScope;
  description?: string;
  ownerId?: string | null;
  owner?: { id: string; name: string } | null;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  phone2?: string;
  email: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  stateInscription?: string;
  rg?: string;
  deletedAt?: string | null;
  tags?: Tag[];
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
  tags?: Tag[];
}

export type OSStatus = 'AGUARDANDO_AVALIACAO' | 'AGUARDANDO_AUTORIZACAO' | 'AGUARDANDO_PECA' | 'EM_MANUTENCAO' | 'PRONTO_RETIRADA' | 'PAGO_PRONTO_RETIRADA' | 'FINALIZADO';

export type OSClosingReason =
  | 'REPARO_CONCLUIDO'
  | 'ORCAMENTO_RECUSADO'
  | 'SEM_CONSERTO'
  | 'DESCARTE_CLIENTE_RETIRA'
  | 'DESCARTE_OFICINA'
  | 'EQUIPAMENTO_SEM_DEFEITO';

export type WarrantyType = 'NENHUMA' | 'FABRICA' | 'OFICINA' | 'MGV';

export type OSFinancialStatus = 'PENDENTE' | 'CREDIARIO' | 'PAGAR_DEPOIS' | 'PAGO';

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

  // ─── Campos Fiscais ────────────────────────────────────────

  // Identificação e Classificação
  unit?: string;
  gtin?: string;
  ncm?: string;
  cest?: string;
  manufacturerCode?: string;
  manufacturer?: string;
  cnpjFab?: string;
  partGroup?: string;
  partSubgroup?: string;
  weightGross?: number;
  weightNet?: number;

  // Tributação ICMS
  cstOrigem?: string;
  cstIcms?: string;
  icmsAliq?: number;
  icmsStAliq?: number;
  icmsRedBc?: number;

  // CFOP
  cfopIntraEstadual?: string;
  cfopInterEstadual?: string;

  // IPI
  ipiAliq?: number;
  ipiEnquadramento?: string;

  // PIS / COFINS
  pisAliq?: number;
  cofinsAliq?: number;

  // Outros Fiscais
  totalTributos?: number;
  cBenef?: string;
  indEscala?: string;

  // ICMS-ST Retido
  bcStRetido?: number;
  icmsStRetido?: number;
  aliqSt?: number;
  icmsSubstituto?: number;
  redBcEfet?: number;
  bcEfet?: number;
  icmsEfetAliq?: number;
  icmsEfetValor?: number;
}

export type AvulsoCategory = 'PECA' | 'SERVICO' | 'CALIBRAGEM' | 'TAXA' | 'FRETE' | 'DESCONTO' | 'OUTROS';

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
  statusCode?: number;
  diagnostic?: string;
  laudoMacro?: string;
  usedParts: UsedPart[];
  laborCost: number;
  calibrationCost?: number;
  discount?: number;
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
  messageHistories?: any[];
  tags?: any[];
  pdfUrl?: string;
  billingLogs?: string[];
  paymentMethod?: string | null;
  
  deletedAt?: string | null;
  stressTestStartedAt?: string | null;
  stressTestStartedBy?: string | null;
  createdAt: string;
  originalExitDate?: string | null;
  closingReason?: OSClosingReason | null;
  profitValue?: number | null;
  profitMarginPercent?: number | null;
  abandonAlert?: Date | null;
  client?: Client | null;
  device?: Device | null;
  warrantyType: WarrantyType;
  financialStatus: OSFinancialStatus;
  financialDueDate?: string | null;

  // Responsável Técnico
  assignedTechnicianId?: string | null;
  assignedTechnician?: {
    id: string;
    name: string;
    role: UserRole;
    avatarUrl?: string | null;
    phone?: string | null;
  } | null;

  // Rentabilidade (Virtual / Computado no backend para OWNER)
  hasZeroCostParts?: boolean;

  // Motor de Recorrência (Virtual / Computado no backend)
  recurrentAlert?: { count: number; previousOsNumbers: string[] } | null;

  // Aviso de Garantia (Virtual / Computado no backend)
  warrantyNotice?: { osNumber: string; originalExitDate: string; warrantyExpiresAt: string } | null;
}

export interface OSHistoryItem {
  id: string;
  orderId: string;
  userId?: string | null;
  userName: string;
  userRole?: string | null;
  actionType: string;
  description: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    role: UserRole;
    avatarUrl?: string | null;
  } | null;
}

// -------------------------------------------------------------
// MÓDULO SAAS: MULTI-TENANCY, PLANOS E ASSINATURAS
// -------------------------------------------------------------

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';
export type BillingCycle = 'MONTHLY' | 'ANNUAL';
export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface Company {
  id: string;
  name: string;
  cnpj?: string | null;
  slug: string;
  active: boolean;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  asaasCustomerId?: string | null;
  createdAt: string;
  subscription?: Subscription | null;
}

export interface Plan {
  id: string;
  name: string;
  tier: PlanTier;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  maxUsers: number;
  maxOrdersPerMonth: number;
  features: string[];
  active: boolean;
}

export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  plan?: Plan;
  status: SubscriptionStatus;
  cycle: BillingCycle;
  asaasSubscriptionId?: string | null;
  trialEndsAt?: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  invoices?: Invoice[];
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  asaasInvoiceId?: string | null;
  amount: number;
  status: string;
  dueDate: string;
  paidAt?: string | null;
  invoiceUrl?: string | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  createdAt: string;
}


