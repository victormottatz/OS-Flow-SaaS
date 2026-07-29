import { describe, it, expect } from "vitest";
import { OSStateMachine } from "../../src/domain/os/os.state-machine";

describe("OSStateMachine - Regras de Transição de Estado", () => {
  it("deve permitir transições válidas do fluxo padrão", async () => {
    // AGUARDANDO_AVALIACAO -> AGUARDANDO_AUTORIZACAO
    const can1 = await OSStateMachine.canTransition("AGUARDANDO_AVALIACAO", "AGUARDANDO_AUTORIZACAO");
    expect(can1).toBe(true);

    // EM_MANUTENCAO -> PRONTO_RETIRADA
    const can2 = await OSStateMachine.canTransition("EM_MANUTENCAO", "PRONTO_RETIRADA");
    expect(can2).toBe(true);

    // PRONTO_RETIRADA -> FINALIZADO
    const can3 = await OSStateMachine.canTransition("PRONTO_RETIRADA", "FINALIZADO");
    expect(can3).toBe(true);
  });

  it("deve permitir a manutenção do mesmo estado (no-op)", async () => {
    const sameState = await OSStateMachine.canTransition("EM_MANUTENCAO", "EM_MANUTENCAO");
    expect(sameState).toBe(true);
  });

  it("deve bloquear transições inválidas ou diretas sem passar pelos estágios intermediários", async () => {
    // Não deve ir direto de AGUARDANDO_AVALIACAO para PRONTO_RETIRADA sem avaliação/manutenção
    const invalid1 = await OSStateMachine.canTransition("AGUARDANDO_AVALIACAO", "PRONTO_RETIRADA");
    expect(invalid1).toBe(false);
  });
});
