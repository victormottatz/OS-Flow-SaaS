/**
 * Guarda global de alterações não salvas (padrão Gmail/GitHub).
 *
 * Formulários marcam a existência de trabalho não salvo e, se o usuário tentar
 * recarregar ou fechar a página, o navegador exibe o aviso nativo:
 * "As alterações que você fez podem não ser salvas."
 *
 * Usamos um CONTADOR (e não um booleano) para suportar vários formulários
 * "sujos" ao mesmo tempo: o aviso só desaparece quando TODOS estiverem limpos.
 */
let dirtyCounter = 0;

/**
 * Marca ou desmarca a existência de alterações não salvas.
 * Chamar com `true` ao detectar campos editados e com `false` na limpeza
 * (salvamento, cancelamento ou desmonte do componente).
 */
export function markUnsavedChanges(dirty: boolean): void {
  dirtyCounter = Math.max(0, dirtyCounter + (dirty ? 1 : -1));
}

/** Retorna `true` se existe ao menos um formulário com alterações não salvas. */
export function hasUnsavedChanges(): boolean {
  return dirtyCounter > 0;
}

/**
 * Instala o listener global de `beforeunload`.
 * Retorna a função de limpeza (para usar em `useEffect`).
 */
export function installUnsavedChangesGuard(): () => void {
  const handler = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges()) {
      // Padrão exigido pelos navegadores modernos (Chrome/Edge/Firefox/Safari)
      event.preventDefault();
      event.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}
