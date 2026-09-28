import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export interface CameraPanZoomProps {
  children: React.ReactNode;
  zoomStartFrame: number;
  zoomEndFrame: number;
  targetScale?: number;
  focusOrigin?: string;
}

export const CameraPanZoom: React.FC<CameraPanZoomProps> = ({
  children,
  zoomStartFrame,
  zoomEndFrame,
  targetScale = 1.35,
  focusOrigin = '70% 45%',
}) => {
  const frame = useCurrentFrame();

  const currentScale = interpolate(
    frame,
    [zoomStartFrame, zoomEndFrame],
    [1.0, targetScale],
    {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transformOrigin: focusOrigin,
          transform: `scale(${currentScale}) translateZ(0)`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};
