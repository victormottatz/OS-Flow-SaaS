import React from 'react';

export interface BrowserFrameProps {
  children: React.ReactNode;
  url?: string;
  className?: string;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  children,
  url = 'app.osflow.com.br/ordens-servico',
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col ${className}`}
      style={{
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.1)',
      }}
    >
      {/* Top Bar do Navegador */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-white/5 select-none">
        {/* Controles de Janela Mac-style */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/40" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/40" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/40" />
        </div>

        {/* Barra de URL */}
        <div className="flex items-center justify-center gap-2 px-6 py-1 bg-slate-900/90 rounded-full border border-white/5 text-xs text-slate-400 font-mono w-72">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate">{url}</span>
        </div>

        {/* Acentos à direita */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>OS-FLOW PRO</span>
        </div>
      </div>

      {/* Conteúdo da Janela */}
      <div className="flex-1 overflow-hidden relative bg-slate-950/95">
        {children}
      </div>
    </div>
  );
};
