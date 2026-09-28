import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import AppLogo from '../../../../src/components/AppLogo';

export const Scene6ClosingMission: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrada do Logo Central
  const logoEntrance = spring({
    frame,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 140 },
  });

  // Entrada da Missão da Empresa
  const missionEntrance = spring({
    frame: frame - 25,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 120 },
  });

  // Entrada do Botão de CTA
  const ctaEntrance = spring({
    frame: frame - 60,
    fps,
    config: { damping: 18, mass: 0.8, stiffness: 150 },
  });

  // Efeito Shimmer reflexivo no botão
  const shimmerPos = interpolate(frame, [80, 160], [-100, 220], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden px-16 select-none"
      style={{
        backgroundColor: '#020617',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Background Aura Radial */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-cyan-500/20 to-emerald-400/20 blur-[180px] pointer-events-none"
        style={{
          transform: `scale(${0.9 + logoEntrance * 0.2}) translateZ(0)`,
        }}
      />

      {/* 1. Logo Oficial OS Flow em Alta Resolução */}
      <div
        style={{
          transform: `scale(${logoEntrance}) translateZ(0)`,
          opacity: logoEntrance,
        }}
        className="flex flex-col items-center text-center mb-8"
      >
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl mb-4">
          <AppLogo className="h-14 w-auto scale-125" showText={true} theme="dark" />
        </div>
      </div>

      {/* 2. Frase Oficial da Missão da Empresa */}
      <div
        style={{
          transform: `translate3d(0, ${(1 - missionEntrance) * 20}px, 0)`,
          opacity: missionEntrance,
        }}
        className="max-w-4xl text-center mb-10 z-10"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3 block">
          — NOSSA MISSÃO —
        </span>
        <blockquote className="text-3xl sm:text-4xl font-extrabold text-white leading-relaxed tracking-tight">
          “Transformar oficinas e assistências técnicas em operações{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            modernas, organizadas e altamente lucrativas
          </span>
          .”
        </blockquote>
      </div>

      {/* 3. Chamada de Ação Final (CTA) com Efeito Shimmer */}
      <div
        style={{
          transform: `scale(${ctaEntrance}) translateZ(0)`,
          opacity: ctaEntrance,
        }}
        className="flex flex-col items-center gap-4 z-10"
      >
        <div className="relative overflow-hidden rounded-2xl group p-[1.5px] bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_40px_rgba(6,182,212,0.3)]">
          <div className="px-10 py-5 rounded-[15px] bg-slate-950 font-extrabold text-white text-lg flex items-center gap-3 relative overflow-hidden">
            <span>Começar Teste de 14 Dias Grátis</span>
            <span className="text-emerald-400 text-xl">➔</span>

            {/* Shimmer Light Bar */}
            <div
              style={{
                transform: `translateX(${shimmerPos}%)`,
              }}
              className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none"
            />
          </div>
        </div>

        {/* Informações de Domínio e Confiança */}
        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono mt-1">
          <span>🌐 app.osflow.com.br</span>
          <span>•</span>
          <span>Sem cartão de crédito</span>
          <span>•</span>
          <span>Suporte Especializado MGV</span>
        </div>
      </div>
    </div>
  );
};
