import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';
import { WordByWordText } from '../../components/WordByWordText';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrada do Badge
  const badgeScale = spring({
    frame,
    fps,
    config: { damping: 16, mass: 0.7, stiffness: 140 },
  });

  // Fade out suave no final da cena (transição para cena 2)
  const fadeOut = interpolate(frame, [105, 120], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Brilho de fundo flutuante
  const glowScale = interpolate(frame, [0, 120], [1, 1.25], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden px-16 select-none"
      style={{ opacity: fadeOut }}
    >
      {/* Background Radial Glow */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none"
        style={{
          transform: `scale(${glowScale}) translateZ(0)`,
          top: '20%',
          left: '25%',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"
        style={{
          bottom: '10%',
          right: '20%',
        }}
      />

      {/* Badge Superior */}
      <div
        style={{
          transform: `scale(${badgeScale}) translateZ(0)`,
          opacity: badgeScale,
        }}
        className="mb-8 inline-flex items-center gap-3 px-5 py-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-sm font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(16,185,129,0.15)]"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        OS-FLOW SAAS • GESTÃO & FATURAMENTO
      </div>

      {/* Título Principal Revelado Palavra por Palavra */}
      <div className="max-w-4xl z-10">
        <WordByWordText
          text="Sua assistência técnica sem gargalos operacionais e com faturamento automático"
          startFrame={12}
          framesPerWord={4}
          highlightWords={['sem', 'gargalos', 'automático']}
          className="text-6xl font-extrabold leading-tight tracking-tight text-white"
        />
      </div>

      {/* Subtítulo Complementar com Entrada Suave */}
      <div
        style={{
          opacity: interpolate(frame, [45, 65], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          transform: `translate3d(0, ${interpolate(frame, [45, 65], [20, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}px, 0)`,
        }}
        className="mt-8 text-xl text-slate-400 font-medium max-w-2xl text-center"
      >
        Do atendimento no balcão à emissão fiscal integrada ao Bling em menos de 10 segundos.
      </div>
    </div>
  );
};
