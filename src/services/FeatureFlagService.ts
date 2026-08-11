import prisma from "../database/prisma";

/**
 * FeatureFlagService — Serviço centralizado de Feature Flags com cache em memória.
 * Evita queries repetitivas ao Prisma em cada requisição.
 * 
 * Uso:
 *   const isEnabled = await featureFlags.isEnabled("SMART_KANBAN");
 *   featureFlags.invalidate(); // Limpa o cache (ex: após toggle)
 */
class FeatureFlagService {
  private cache: Map<string, boolean> = new Map();
  private lastFetch: number = 0;
  private readonly TTL_MS = 30_000; // Cache de 30 segundos

  /**
   * Verifica se uma feature flag está ativada.
   * Utiliza cache em memória com TTL para reduzir chamadas ao banco.
   */
  async isEnabled(key: string): Promise<boolean> {
    const now = Date.now();

    // Se o cache expirou, recarrega todas as flags de uma vez
    if (now - this.lastFetch > this.TTL_MS || this.cache.size === 0) {
      await this.loadAll();
    }

    return this.cache.get(key) ?? false;
  }

  /**
   * Carrega todas as flags do banco para o cache em memória.
   */
  private async loadAll(): Promise<void> {
    try {
      const flags = await prisma.featureFlag.findMany();
      this.cache.clear();
      for (const flag of flags) {
        this.cache.set(flag.key, flag.value);
      }
      this.lastFetch = Date.now();
    } catch (err) {
      console.error("[FeatureFlagService] Erro ao carregar flags:", err);
      // Mantém cache anterior e registra timestamp para evitar sobrecarregar o pool de conexões com falhas repetidas
      this.lastFetch = Date.now();
    }
  }

  /**
   * Invalida o cache manualmente (chamar após toggle de flag).
   */
  invalidate(): void {
    this.cache.clear();
    this.lastFetch = 0;
  }
}

export const featureFlags = new FeatureFlagService();
