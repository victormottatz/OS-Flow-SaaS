import { OSStatus, OSClosingReason } from '@prisma/client';
import { BaseImportAgent, RowData } from './BaseImportAgent.js';

export class AguardandoAvaliacaoAgent extends BaseImportAgent {
  getTargetStatus() { return OSStatus.AGUARDANDO_AVALIACAO; }
  getClosingReason() { return null; }
  applySpecialRules(osData: any, row: RowData) {
    if (row.statusStr.includes('GARANTIA')) {
      osData.diagnostic = (osData.diagnostic || '') + '\n[IMPORT] Marcado como Garantia no SH Oficina.';
    }
    return osData;
  }
}

export class AguardandoAutorizacaoAgent extends BaseImportAgent {
  getTargetStatus() { return OSStatus.AGUARDANDO_AUTORIZACAO; }
  getClosingReason() { return null; }
  applySpecialRules(osData: any, row: RowData) {
    if (row.statusStr.includes('GARANTIA')) {
      osData.diagnostic = (osData.diagnostic || '') + '\n[IMPORT] Marcado como Garantia no SH Oficina.';
    }
    return osData;
  }
}

export class AguardandoPecaAgent extends BaseImportAgent {
  getTargetStatus() { return OSStatus.AGUARDANDO_PECA; }
  getClosingReason() { return null; }
  applySpecialRules(osData: any) { return osData; }
}

export class ReparoEmAndamentoAgent extends BaseImportAgent {
  getTargetStatus() { return OSStatus.EM_MANUTENCAO; }
  getClosingReason() { return null; }
  applySpecialRules(osData: any, row: RowData) {
    if (row.statusStr.includes('FABRICA')) {
      osData.diagnostic = (osData.diagnostic || '') + '\n[IMPORT] Enviado para Fábrica.';
    }
    return osData;
  }
}

export class ProntoRetiradaAgent extends BaseImportAgent {
  getTargetStatus() { return OSStatus.PRONTO_RETIRADA; }
  getClosingReason() { return null; }
  applySpecialRules(osData: any) { return osData; }
}

export class PagoProntoRetiradaAgent extends BaseImportAgent {
  getTargetStatus() { return OSStatus.PAGO_PRONTO_RETIRADA; }
  getClosingReason() { return null; }
  applySpecialRules(osData: any) { return osData; }
}

export class FinalizadoAgent extends BaseImportAgent {
  getTargetStatus() { return OSStatus.FINALIZADO; }
  getClosingReason(): OSClosingReason {
    // Definiremos dinamicamente no applySpecialRules
    return OSClosingReason.REPARO_CONCLUIDO;
  }
  applySpecialRules(osData: any, row: RowData) {
    if (row.statusStr.includes('ENTREGUE REPARADO')) {
      osData.closingReason = OSClosingReason.REPARO_CONCLUIDO;
    } else if (row.statusStr.includes('ENTREGUE - FALTA PGTO')) {
      osData.closingReason = OSClosingReason.REPARO_CONCLUIDO;
      osData.billingStatus = 'PENDENTE';
    } else if (row.statusStr.includes('DEVOLVIDO SEM REPARO') || row.statusStr.includes('DESISTIU')) {
      osData.closingReason = OSClosingReason.ORCAMENTO_RECUSADO;
    } else if (row.statusStr.includes('DESCARTADO')) {
      osData.closingReason = OSClosingReason.DESCARTE_OFICINA;
    }
    return osData;
  }
}
