import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export interface VirtualCursorProps {
  startFrame: number;
  clickFrame: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export const VirtualCursor: React.FC<VirtualCursorProps> = ({
  startFrame,
  clickFrame,
  from,
  to,
}) => {
  const frame = useCurrentFrame();

  // Movimento de aproximação desacelerado natural (Apple mouse curve)
  const moveProgress = interpolate(frame, [startFrame, clickFrame - 4], [0, 1], {
    easing: Easing.bezier(0.25, 1, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const posX = from.x + (to.x - from.x) * moveProgress;
  const posY = from.y + (to.y - from.y) * moveProgress;

  // Animação tátil de clique
  const isClicking = frame >= clickFrame && frame <= clickFrame + 8;
  const clickScale = isClicking ? 0.85 : 1.0;

  // Efeito Ripple (anel de onda expansiva no clique)
  const rippleProgress = interpolate(frame, [clickFrame, clickFrame + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rippleScale = rippleProgress * 3;
  const rippleOpacity = 1 - rippleProgress;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate3d(${posX}px, ${posY}px, 0) scale(${clickScale})`,
        zIndex: 9999,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      {/* Seta do Cursor SVG */}
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>
        <path
          d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
          fill="#020617"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Onda de Clique (Ripple) */}
      {frame >= clickFrame && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            transform: `scale(${rippleScale}) translateZ(0)`,
            opacity: rippleOpacity,
          }}
        />
      )}
    </div>
  );
};
