import { OSStatus } from "../../types";

export interface StateTransition {
  from: OSStatus;
  to: OSStatus;
}

export class OSStateMachine {
  private static validTransitions: StateTransition[] = [
    { from: "AGUARDANDO_AVALIACAO", to: "AGUARDANDO_AUTORIZACAO" },
    { from: "AGUARDANDO_AVALIACAO", to: "FINALIZADO" },
    { from: "AGUARDANDO_AUTORIZACAO", to: "EM_MANUTENCAO" },
    { from: "AGUARDANDO_AUTORIZACAO", to: "AGUARDANDO_PECA" },
    { from: "AGUARDANDO_AUTORIZACAO", to: "FINALIZADO" },
    { from: "AGUARDANDO_PECA", to: "EM_MANUTENCAO" },
    { from: "EM_MANUTENCAO", to: "AGUARDANDO_PECA" },
    { from: "EM_MANUTENCAO", to: "PRONTO_RETIRADA" },
    { from: "PRONTO_RETIRADA", to: "FINALIZADO" },
    { from: "PRONTO_RETIRADA", to: "PAGO_PRONTO_RETIRADA" },
    { from: "PAGO_PRONTO_RETIRADA", to: "FINALIZADO" },
    { from: "PRONTO_RETIRADA", to: "EM_MANUTENCAO" },
    { from: "FINALIZADO", to: "EM_MANUTENCAO" },
    { from: "FINALIZADO", to: "AGUARDANDO_AVALIACAO" }
  ];

  static canTransition(from: OSStatus, to: OSStatus): boolean {
    if (from === to) return true; // Nenhuma mudança real
    return this.validTransitions.some(t => t.from === from && t.to === to);
  }
}
