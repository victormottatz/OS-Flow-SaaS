import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { AnimatedCounter } from '../../components/AnimatedCounter';

export const Scene3Outcome: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrada do Card de Sucesso Fiscal
  const successBadgeScale = spring({
    frame,
    fps,
    config: { damping: 16, mass: 0.7, stiffness: 160 },
  });

  // Entrada do Contador e Métricas
  const metricsEntrance = spring({
    frame: frame - 20,
    fps,
    config: { damping: 18, mass: 0.8, stiffness: 140 },
  });

  // Entrada do CTA final
  const ctaEntrance = spring({
    frame: frame - 55,
    fps,
    config: { damping: 18, mass: 0.8, stiffness: 150 },
  });

  // Efeito Shimmer no botão de CTA
  const shimmerPos = interpolate(frame, [70, 140], [-100, 200], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden px-16 select-none">
      {/* Luzes de fundo de celebração */}
      <div className="absolute w-[700px] h-[700px] rounded-full bg-emerald-500/15 blur-[160px] pointer-events-none top-1/4" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none bottom-1/4" />

      {/* 1. Card de Confirmação Fiscal Bling */}
      <div
        style={{
          transform: `scale(${successBadgeScale}) translateZ(0)`,
          opacity: successBadgeScale,
        }}
        className="mb-8 p-6 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 backdrop-blur-xl flex items-center gap-5 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg shadow-emerald-500/40">
          ✓
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-white">NF-e #4819 Emitida com Sucesso!</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              Bling V3 • Autorizada
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Estoque de peças baixado, financeiro lançado e WhatsApp enviado ao cliente automaticamente.
          </p>
        </div>
      </div>

      {/* 2. Grid de Métricas em Tempo Real */}
      <div
        style={{
          transform: `scale(${metricsEntrance}) translateZ(0)`,
          opacity: metricsEntrance,
        }}
        className="grid grid-cols-2 gap-6 w-[800px] mb-12"
      >
        {/* Métrica 1: Faturamento do Dia */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Faturamento do Dia
          </span>
          <AnimatedCounter
            value={14250}
            durationInFrames={50}
            startFrame={25}
            prefix="R$ "
            decimals={2}
            className="text-4xl font-black text-emerald-400 font-mono"
          />
          <span className="text-[11px] text-emerald-400/80 font-medium mt-1">
            ▲ +R$ 1.450,00 da OS #1042
          </span>
        </div>

        {/* Métrica 2: Ordens de Serviço */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Ordens de Serviço Hoje
          </span>
          <AnimatedCounter
            value={24}
            durationInFrames={40}
            startFrame={25}
            suffix=" OS"
            className="text-4xl font-black text-cyan-400 font-mono"
          />
          <span className="text-[11px] text-slate-400 font-medium mt-1">
            Tempo médio de fechamento: 4.2 min
          </span>
        </div>
      </div>

      {/* 3. Encerramento & Call to Action (CTA) */}
      <div
        style={{
          transform: `scale(${ctaEntrance}) translateZ(0)`,
          opacity: ctaEntrance,
        }}
        className="flex flex-col items-center text-center z-10"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-extrabold text-lg">
            OS
          </div>
          <span className="text-3xl font-black tracking-tight text-white">OS-FLOW SAAS</span>
        </div>

        <p className="text-slate-300 text-sm font-medium mb-6">
          A plataforma inteligente para assistências técnicas de alta rentabilidade.
        </p>

        {/* Botão com efeito Shimmer */}
        <div className="relative overflow-hidden rounded-xl group p-[1px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500">
          <div className="px-8 py-4 rounded-[11px] bg-slate-950 font-bold text-white text-base flex items-center gap-3 shadow-2xl relative overflow-hidden">
            <span>Experimente Grátis por 14 Dias</span>
            <span className="text-emerald-400 text-lg">➔</span>

            {/* Shimmer Light Bar */}
            <div
              style={{
                transform: `translateX(${shimmerPos}%)`,
              }}
              className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
