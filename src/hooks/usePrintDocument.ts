/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from "react";

/**
 * Dispara a impressão do documento ativo (`.printable-area` / `#printable-*`).
 *
 * - Se `filename` for informado, o título da aba é trocado antes do print —
 *   o navegador usa o título como nome do arquivo ao escolher "Salvar como PDF".
 * - O título original é restaurado em `afterprint` (com fallback em 1,5s).
 * - O atraso de 150ms garante que o React já tenha renderizado o bloco
 *   imprimível (padrão usado nos componentes atuais).
 */
export function usePrintDocument() {
  return useCallback((filename?: string) => {
    const originalTitle = document.title;
    let fallbackTimer: number | undefined;
    let restored = false;

    const restoreTitle = () => {
      if (restored) return;
      restored = true;
      window.removeEventListener("afterprint", restoreTitle);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      document.title = originalTitle;
    };

    if (filename) {
      document.title = filename;
    }

    // Restauração principal: dispara quando o diálogo de impressão fecha
    // (imprimir ou cancelar) em Chrome/Edge/Firefox e Safari moderno.
    window.addEventListener("afterprint", restoreTitle);

    // Fallback para navegadores que não disparam afterprint (Safari antigo).
    // 20s em vez de 1,5s: o título NÃO deve ser restaurado enquanto o usuário
    // ainda está no diálogo escolhendo "Salvar como PDF" — senão o nome do
    // arquivo gerado sai errado (o navegador usa o título como nome).
    fallbackTimer = window.setTimeout(restoreTitle, 20000);

    // Atraso de 150ms: garante que o React já renderizou o bloco imprimível
    // (padrão usado nos componentes atuais).
    window.setTimeout(() => window.print(), 150);
  }, []);
}
