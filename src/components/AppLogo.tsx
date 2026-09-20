/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AppLogo — Componente oficial de identidade visual do OS Flow (SaaS).
 * Renderiza o símbolo vetorial nativo em alta definição com suporte
 * a logotipos customizados por empresa (White-label).
 */
import React, { useState } from "react";

interface AppLogoProps {
  src?: string;
  fallbackSrc?: string;
  alt?: string;
  className?: string;
  showText?: boolean;
  theme?: "dark" | "light";
}

export default function AppLogo({
  src,
  fallbackSrc,
  alt = "OS Flow",
  className = "h-8 w-auto",
  showText = true,
  theme = "dark",
}: AppLogoProps) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);
  const [hasImageError, setHasImageError] = useState(false);

  // Se houver uma imagem personalizada configurada e sem erro de carregamento:
  if (currentSrc && !hasImageError) {
    return (
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        onError={() => {
          if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
          } else {
            setHasImageError(true);
          }
        }}
      />
    );
  }

  const isLight = theme === "light";

  // Logo Vetorial Nativo Oficial do OS Flow em Alta Resolução
  return (
    <div className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-emerald-400 p-[1.5px] shadow-md shadow-cyan-500/20">
          <div className="w-full h-full bg-[#090D18] rounded-[10px] flex items-center justify-center relative overflow-hidden">
            <div className="flex items-center -space-x-1 relative z-10">
              <span className="w-2.5 h-4 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-sm transform -skew-x-12" />
              <span className="w-2.5 h-4 bg-gradient-to-b from-emerald-400 to-cyan-400 rounded-sm transform -skew-x-12 opacity-90" />
            </div>
          </div>
        </div>
      </div>
      {showText && (
        <div className="flex flex-col leading-none text-left">
          <div className="flex items-center space-x-1">
            <span className={`font-extrabold text-base tracking-tight font-sans ${isLight ? "text-slate-900" : "text-white"}`}>
              OS <span className="text-cyan-500 font-black">FLOW</span>
            </span>
          </div>
          <span className={`text-[8.5px] font-mono font-bold tracking-widest uppercase mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            SISTEMA INTEGRADO
          </span>
        </div>
      )}
    </div>
  );
}
