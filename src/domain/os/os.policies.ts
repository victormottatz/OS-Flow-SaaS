import prisma from "../../database/prisma";
import { OSStatus } from "../../types";

export class OSPolicies {
  /**
   * Valida se uma OS pode avançar para o status final (PRONTO_RETIRADA ou FINALIZADO)
   * Políticas impostas:
   * 1. Peças que requerem serial (requiresSerial = true) devem ter serial preenchido.
   * 2. Checklist de Saída não pode estar vazio se exigido pela categoria do equipamento (Opcional por agora).
   */
  static async canFinishOS(osUsedParts: any[]): Promise<{ allowed: boolean; missingSerials?: string[]; error?: string }> {
    const parts = await prisma.part.findMany();
    const missingSerials: string[] = [];

    for (const usedPart of osUsedParts) {
      const partDef = parts.find((p: any) => p.id === usedPart.partId);
      if (partDef && partDef.requiresSerial && (!usedPart.serialNumber || usedPart.serialNumber.trim() === "")) {
        missingSerials.push(partDef.name || partDef.code);
      }
    }

    if (missingSerials.length > 0) {
      return {
        allowed: false,
        missingSerials,
        error: `Bloqueio de Serialização: As seguintes peças exigem Número de Série antes de avançar: ${missingSerials.join(", ")}.`
      };
    }

    return { allowed: true };
  }
}
