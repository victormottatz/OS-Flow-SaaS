import { useEffect } from "react";
import { markUnsavedChanges } from "../utils/unsavedChanges";

/**
 * Liga um estado "formulário sujo" à guarda global de alterações não salvas.
 *
 * Enquanto `dirty` for `true`, o navegador avisa antes de recarregar/fechar a
 * página. Quando o formulário é salvo, cancelado ou o componente é desmontado,
 * a marcação é removida automaticamente (via cleanup do efeito).
 */
export function useUnsavedChangesGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    markUnsavedChanges(true);
    return () => markUnsavedChanges(false);
  }, [dirty]);
}
