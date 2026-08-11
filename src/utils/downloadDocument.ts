/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Baixa o PDF real gerado no servidor (POST /api/documents/pdf/:templateId).
 *
 * @returns true se o PDF foi baixado; false se falhou (para o chamador cair no
 * fallback de impressão via navegador, preservando o fluxo atual).
 */
export async function downloadDocumentPdf(
  templateId: string,
  osId: string,
  filenameFallback?: string,
  dataEmissao?: string
): Promise<boolean> {
  try {
    const token = localStorage.getItem("mgv_token") || "";
    const res = await fetch(`/api/documents/pdf/${templateId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ osId, dataEmissao })
    });

    if (!res.ok) {
      console.warn(`[downloadDocumentPdf] HTTP ${res.status}: ${await res.text()}`);
      return false;
    }

    const blob = await res.blob();
    // O servidor define o Content-Disposition com o nome do arquivo; usa o
    // fallback se o header não vier disponível.
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename="?([^";]+)"?/i);
    const filename = (match && match[1]) || filenameFallback || `${templateId}-${osId}.pdf`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return true;
  } catch (err) {
    console.warn("[downloadDocumentPdf] Falha ao gerar PDF no servidor:", err);
    return false;
  }
}
