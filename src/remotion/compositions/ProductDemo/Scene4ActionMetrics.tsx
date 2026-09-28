import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { AnimatedCounter } from '../../components/AnimatedCounter';

export const Scene4ActionMetrics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrada do Card de Sucesso Fiscal
  const successBadgeScale = spring({
    frame,
    fps,
    config: { damping: 16, mass: 0.7, stiffness: 160 },
  });

  // Entrada da Notificação WhatsApp
  const whatsappEntrance = spring({
    frame: frame - 15,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 150 },
  });

  // Entrada das Métricas
  const metricsEntrance = spring({
    frame: frame - 30,
    fps,
    config: { damping: 18, mass: 0.8, stiffness: 140 },
  });

  // Fade out suave
  const fadeOut = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden px-16 select-none"
      style={{
        backgroundColor: '#020617',
        color: '#ffffff',
        opacity: fadeOut,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Luzes de fundo */}
      <div className="absolute w-[700px] h-[700px] rounded-full bg-emerald-500/12 blur-[160px] pointer-events-none top-1/4" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none bottom-1/4" />

      {/* 1. Confirmação Fiscal Bling + WhatsApp */}
      <div className="flex items-center gap-6 mb-8">
        {/* Card Fiscal */}
        <div
          style={{
            transform: `scale(${successBadgeScale}) translateZ(0)`,
            opacity: successBadgeScale,
          }}
          className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 backdrop-blur-xl flex items-center gap-4 shadow-[0_0_40px_rgba(16,185,129,0.18)]"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 text-xl font-black shadow-lg shadow-emerald-500/30">
            ✓
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-black text-white">NF-e #4819 Emitida</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                Bling V3 • Autorizada
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Peças baixadas do estoque e lançadas no financeiro.
            </p>
          </div>
        </div>

        {/* Notificação WhatsApp */}
        <div
          style={{
            transform: `scale(${whatsappEntrance}) translateZ(0)`,
            opacity: whatsappEntrance,
          }}
          className="p-5 rounded-2xl border border-[#25D366]/40 bg-[#092e18]/50 backdrop-blur-xl flex items-center gap-4 shadow-[0_0_40px_rgba(37,211,102,0.15)]"
        >
          <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center text-slate-950 text-xl font-black shadow-lg shadow-[#25D366]/30">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">WhatsApp Enviado</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold">
                100% Automático
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Cliente notificado com link da NF e comprovante.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Grid de Métricas em Tempo Real */}
      <div
        style={{
          transform: `scale(${metricsEntrance}) translateZ(0)`,
          opacity: metricsEntrance,
        }}
        className="grid grid-cols-2 gap-6 w-[860px]"
      >
        {/* Métrica 1: Faturamento do Dia */}
        <div className="p-7 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-2xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Faturamento da Bancada Hoje
          </span>
          <AnimatedCounter
            value={14250}
            durationInFrames={50}
            startFrame={35}
            prefix="R$ "
            decimals={2}
            className="text-5xl font-black text-emerald-400 font-mono"
          />
          <span className="text-xs text-emerald-400/90 font-semibold mt-1.5 flex items-center gap-1">
            ▲ +R$ 1.450,00 da OS #1042 recém-faturada
          </span>
        </div>

        {/* Métrica 2: Ordens de Serviço */}
        <div className="p-7 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-2xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Ordens de Serviço Concluídas
          </span>
          <AnimatedCounter
            value={24}
            durationInFrames={40}
            startFrame={35}
            suffix=" OS"
            className="text-5xl font-black text-cyan-400 font-mono"
          />
          <span className="text-xs text-slate-400 font-semibold mt-1.5">
            Tempo médio de fechamento: 4.2 minutos
          </span>
        </div>
      </div>
    </div>
  );
};
