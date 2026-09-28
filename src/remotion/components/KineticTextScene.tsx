import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';
import { WordByWordText } from './WordByWordText';

export interface KineticTextSceneProps {
  badgeText: string;
  headline: string;
  highlightWords?: string[];
  subheadline?: string;
  featurePills?: Array<{ icon?: string; title: string }>;
  accentColor?: 'emerald' | 'cyan' | 'amber';
  durationInFrames: number;
}

export const KineticTextScene: React.FC<KineticTextSceneProps> = ({
  badgeText,
  headline,
  highlightWords = [],
  subheadline,
  featurePills,
  accentColor = 'emerald',
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrada do Badge
  const badgeScale = spring({
    frame,
    fps,
    config: { damping: 16, mass: 0.7, stiffness: 150 },
  });

  // Fade out suave no final da cena
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Escala dinâmica de fundo
  const glowScale = interpolate(frame, [0, durationInFrames], [1, 1.3], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const colorConfig = {
    emerald: {
      badgeBg: 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.2)]',
      dot: 'bg-emerald-400',
      glow1: 'bg-emerald-500/12',
      glow2: 'bg-cyan-500/10',
      highlightClass: 'text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.45)]',
      pillBorder: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200',
    },
    cyan: {
      badgeBg: 'bg-cyan-950/50 border-cyan-500/30 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.2)]',
      dot: 'bg-cyan-400',
      glow1: 'bg-cyan-500/12',
      glow2: 'bg-indigo-500/10',
      highlightClass: 'text-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.45)]',
      pillBorder: 'border-cyan-500/30 bg-cyan-950/30 text-cyan-200',
    },
    amber: {
      badgeBg: 'bg-amber-950/50 border-amber-500/30 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.2)]',
      dot: 'bg-amber-400',
      glow1: 'bg-amber-500/12',
      glow2: 'bg-rose-500/10',
      highlightClass: 'text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.45)]',
      pillBorder: 'border-amber-500/30 bg-amber-950/30 text-amber-200',
    },
  }[accentColor];

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
      {/* Background Glows */}
      <div
        className={`absolute w-[850px] h-[850px] rounded-full ${colorConfig.glow1} blur-[160px] pointer-events-none`}
        style={{
          transform: `scale(${glowScale}) translateZ(0)`,
          top: '15%',
          left: '20%',
        }}
      />
      <div
        className={`absolute w-[650px] h-[650px] rounded-full ${colorConfig.glow2} blur-[140px] pointer-events-none`}
        style={{
          bottom: '10%',
          right: '20%',
        }}
      />

      {/* 1. Badge Superior */}
      <div
        style={{
          transform: `scale(${badgeScale}) translateZ(0)`,
          opacity: badgeScale,
        }}
        className={`mb-8 inline-flex items-center gap-3 px-6 py-2.5 rounded-full border text-sm font-bold tracking-wider uppercase backdrop-blur-md ${colorConfig.badgeBg}`}
      >
        <span className={`w-2 h-2 rounded-full ${colorConfig.dot} animate-ping`} />
        {badgeText}
      </div>

      {/* 2. Título Cinético */}
      <div className="max-w-5xl z-10">
        <WordByWordText
          text={headline}
          startFrame={10}
          framesPerWord={4}
          highlightWords={highlightWords}
          highlightClassName={colorConfig.highlightClass}
          className="text-6xl font-black leading-tight tracking-tight text-white text-center"
        />
      </div>

      {/* 3. Subtítulo Suave */}
      {subheadline && (
        <div
          style={{
            opacity: interpolate(frame, [35, 55], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `translate3d(0, ${interpolate(frame, [35, 55], [20, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}px, 0)`,
          }}
          className="mt-8 text-xl text-slate-400 font-medium max-w-3xl text-center z-10"
        >
          {subheadline}
        </div>
      )}

      {/* 4. Pílulas de Recursos (Opcional) */}
      {featurePills && featurePills.length > 0 && (
        <div
          style={{
            opacity: interpolate(frame, [50, 70], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `translate3d(0, ${interpolate(frame, [50, 70], [20, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}px, 0)`,
          }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4 z-10"
        >
          {featurePills.map((pill, idx) => (
            <div
              key={idx}
              className={`px-5 py-2.5 rounded-xl border backdrop-blur-md text-sm font-semibold flex items-center gap-2.5 shadow-lg ${colorConfig.pillBorder}`}
            >
              {pill.icon && <span>{pill.icon}</span>}
              <span>{pill.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
