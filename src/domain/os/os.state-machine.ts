import { OSStatus } from "../../types";

export interface StateTransition {
  from: OSStatus;
  to: OSStatus;
}

export class OSStateMachine {
  private static validTransitions: StateTransition[] = [
    { from: "ORCAMENTO", to: "AGUARDANDO_PECA" },
    { from: "ORCAMENTO", to: "EM_MANUTENCAO" },
    { from: "AGUARDANDO_PECA", to: "EM_MANUTENCAO" },
    { from: "EM_MANUTENCAO", to: "AGUARDANDO_PECA" },
    { from: "EM_MANUTENCAO", to: "PRONTO_RETIRADA" },
    { from: "PRONTO_RETIRADA", to: "FINALIZADO" },
    { from: "PRONTO_RETIRADA", to: "EM_MANUTENCAO" }, // Caso o cliente reprove o conserto na entrega
    { from: "FINALIZADO", to: "EM_MANUTENCAO" } // Garantia (reabertura controlada)
  ];

  static canTransition(from: OSStatus, to: OSStatus): boolean {
    if (from === to) return true; // Nenhuma mudança real
    return this.validTransitions.some(t => t.from === from && t.to === to);
  }
}
