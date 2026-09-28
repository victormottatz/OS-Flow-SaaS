import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export interface AnimatedCounterProps {
  value: number;
  durationInFrames: number;
  startFrame?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  durationInFrames,
  startFrame = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = 'font-mono text-5xl font-black text-white',
}) => {
  const frame = useCurrentFrame();

  const rawNumber = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    [0, value],
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const formatted = rawNumber.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
