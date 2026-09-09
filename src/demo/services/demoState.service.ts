import { DEMO_USER, DEMO_CLIENTS, DEMO_PARTS, DEMO_ORDERS } from "../data/mockData";

const DEMO_STORAGE_KEY = "osflow_live_demo";

export const demoStateService = {
  /**
   * Verifica se a sessão atual está em modo de demonstração.
   */
  isDemoActive(): boolean {
    return localStorage.getItem(DEMO_STORAGE_KEY) === "true";
  },

  /**
   * Ativa a sessão de demonstração e grava a flag no armazenamento local.
   */
  startDemo(): void {
    localStorage.setItem(DEMO_STORAGE_KEY, "true");
  },

  /**
   * Finaliza e zera a sessão de demonstração.
   */
  exitDemo(): void {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  },

  /**
   * Retorna os dados iniciais mockados para hidratação do sistema.
   */
  getInitialState() {
    return {
      user: DEMO_USER,
      clients: DEMO_CLIENTS,
      parts: DEMO_PARTS,
      orders: DEMO_ORDERS,
    };
  }
};
