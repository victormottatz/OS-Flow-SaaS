import React from "react";
import { Zap, Play, LogOut, ShieldCheck } from "lucide-react";

interface DemoBannerProps {
  onExitDemo: () => void;
}

export default function DemoBanner({ onExitDemo }: DemoBannerProps) {
  return (
    <div className="bg-[#080D1A]/95 border-b border-cyan-500/30 px-4 py-2.5 text-xs flex items-center justify-between z-50 sticky top-0 shadow-xl backdrop-blur-xl text-white">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="font-mono font-bold text-cyan-300 text-[10px] uppercase tracking-wider">
            OS FLOW • LIVE DEMO
          </span>
        </div>
        <span className="hidden md:inline text-slate-300 text-[11px]">
          Você está navegando em uma sessão de demonstração com dados em memória isolados.
        </span>
      </div>

      <div className="flex items-center space-x-2.5">
        <button
          onClick={onExitDemo}
          className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-white/[0.1] hover:border-cyan-500/40 transition-all"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400" />
          <span>Sair da Demonstração</span>
        </button>
      </div>
    </div>
  );
}
