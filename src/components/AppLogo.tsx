/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from "react";

// Detecta suporte a decodificação WebP via canvas (uma única vez no carregamento).
// Browsers antigos (ex.: versões antigas de print/IE/Edge legado) retornam
// "data:image/png" mesmo pedindo "image/webp" — nesse caso usamos o PNG direto,
// evitando imagem quebrada no print. O try/catch garante que ambientes sem
// canvas funcional (jsdom em testes, browsers com canvas bloqueado por
// privacidade) degradem para o PNG em vez de quebrar o import do módulo.
const WEBP_SUPPORTED = (() => {
  try {
    return (
      typeof document !== "undefined" &&
      typeof document.createElement === "function" &&
      document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0
    );
  } catch {
    return false;
  }
})();

interface AppLogoProps {
  src?: string;
  fallbackSrc?: string;
  alt?: string;
  className?: string;
}

/**
 * Logo da marca com fallback automático para PNG.
 *
 * - Se o navegador não suportar WebP, já renderiza o PNG direto.
 * - Se o WebP falhar ao carregar por qualquer motivo (404, decode), o
 *   onError troca para o PNG na hora.
 *
 * Uso:
 *   <AppLogo className="h-10 w-auto object-contain" />
 *   <AppLogo src="/logos/LOGO V3.0 (3).webp" fallbackSrc="/logos/LOGO V3.0 (90).png" />
 */
export default function AppLogo({
  src = "/logos/logo-v3.webp",
  fallbackSrc = "/logos/logo-v3.png",
  alt = "MGV One Hub",
  className = "",
}: AppLogoProps) {
  const [currentSrc, setCurrentSrc] = useState(WEBP_SUPPORTED ? src : fallbackSrc);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
