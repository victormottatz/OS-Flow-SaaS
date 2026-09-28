import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export interface WordByWordTextProps {
  text: string;
  startFrame?: number;
  framesPerWord?: number;
  className?: string;
  highlightWords?: string[];
  highlightClassName?: string;
}

export const WordByWordText: React.FC<WordByWordTextProps> = ({
  text,
  startFrame = 0,
  framesPerWord = 5,
  className = 'text-6xl font-extrabold text-white tracking-tight',
  highlightWords = [],
  highlightClassName = 'text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]',
}) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');

  return (
    <div className={`flex flex-wrap justify-center gap-x-4 gap-y-3 text-center ${className}`}>
      {words.map((word, index) => {
        const wordStart = startFrame + index * framesPerWord;
        const progress = interpolate(frame, [wordStart, wordStart + 10], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const translateY = (1 - progress) * 24;
        const opacity = progress;
        const isHighlighted = highlightWords.some(
          (hw) => word.toLowerCase().includes(hw.toLowerCase())
        );

        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              transform: `translate3d(0, ${translateY}px, 0)`,
              opacity,
              willChange: 'transform, opacity',
            }}
            className={isHighlighted ? highlightClassName : ''}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
