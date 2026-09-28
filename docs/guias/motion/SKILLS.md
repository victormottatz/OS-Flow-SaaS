# ⚡ Remotion Motion Skills & Component Recipes

> **Objetivo:** Repositório de código pronto, funções de física, easings complexos e componentes reutilizáveis para Remotion e IA Video Pipelines.

---

## 1. Funções Utilitárias e Easing Complexo

### A. Factory de Springs Pré-Configurados
Evite repetir configurações de spring soltas pelo código. Utilize este helper tipado:

```tsx
import { spring, SpringConfig } from 'remotion';

export type SpringPreset = 'snappy' | 'cinematic' | 'bouncy' | 'gentle';

export const SPRING_PRESETS: Record<SpringPreset, Partial<SpringConfig>> = {
  snappy: { damping: 18, mass: 0.8, stiffness: 160 },
  cinematic: { damping: 26, mass: 1.2, stiffness: 90 },
  bouncy: { damping: 11, mass: 0.6, stiffness: 180 },
  gentle: { damping: 30, mass: 1.8, stiffness: 60 },
};

export function getSpringValue({
  frame,
  fps,
  delay = 0,
  preset = 'snappy',
  from = 0,
  to = 1,
}: {
  frame: number;
  fps: number;
  delay?: number;
  preset?: SpringPreset;
  from?: number;
  to?: number;
}) {
  const spr = spring({
    frame: frame - delay,
    fps,
    config: SPRING_PRESETS[preset],
  });

  return from + spr * (to - from);
}
```

---

### B. Easing Complexo: Curva Cinematográfica Dinâmica
Para curvas assimétricas com desaceleração exponencial no final:

```tsx
import { interpolate, Easing } from 'remotion';

export function cinematicInterpolate({
  frame,
  startFrame,
  endFrame,
  from,
  to,
}: {
  frame: number;
  startFrame: number;
  endFrame: number;
  from: number;
  to: number;
}) {
  return interpolate(frame, [startFrame, endFrame], [from, to], {
    // Easing cúbico hiper-suave no final (padrão de vinhetas tech)
    easing: Easing.bezier(0.08, 0.82, 0.17, 1.0),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}
```

---

## 2. Componentes Prontos de Alta Fidelidade

### A. Texto com Revelação Escalonada (*Staggered Split Text*)
Anima letras ou palavras individualmente com rotação, escala e opacidade.

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { getSpringValue } from './springUtils';

interface StaggeredTextProps {
  text: string;
  startFrame?: number;
  staggerDelay?: number; // frames entre cada letra
  className?: string;
}

export const StaggeredText: React.FC<StaggeredTextProps> = ({
  text,
  startFrame = 0,
  staggerDelay = 2,
  className = 'text-4xl font-bold text-white',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const letters = text.split('');

  return (
    <div className={`flex flex-wrap overflow-hidden ${className}`}>
      {letters.map((char, index) => {
        const delay = startFrame + index * staggerDelay;
        const progress = getSpringValue({
          frame,
          fps,
          delay,
          preset: 'snappy',
          from: 0,
          to: 1,
        });

        const translateY = (1 - progress) * 40; // sobe 40px
        const opacity = progress;
        const rotateX = (1 - progress) * 45; // rotação 3D sutil

        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              transform: `translate3d(0, ${translateY}px, 0) rotateX(${rotateX}deg)`,
              opacity,
              willChange: 'transform, opacity',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </div>
  );
};
```

---

### B. Contador Numérico de Alta Precisão (*Smooth Counter*)
Ideal para métricas de SaaS, faturamento e números de OS.

```tsx
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

interface AnimatedCounterProps {
  value: number;
  durationInFrames: number;
  startFrame?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  durationInFrames,
  startFrame = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
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
    <span className="font-mono tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
```

---

### C. Transição de Cena Cinematográfica (Scale & Fade Blur)
Envolve uma cena completa permitindo entrada e saída cinematográfica com aceleração total.

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { getSpringValue } from './springUtils';

export const SceneWrapper: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  transitionFrames?: number;
}> = ({ children, durationInFrames, transitionFrames = 15 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrada
  const enterScale = getSpringValue({
    frame,
    fps,
    delay: 0,
    preset: 'cinematic',
    from: 0.92,
    to: 1.0,
  });

  // Saída no final do clipe
  const exitProgress = Math.max(0, frame - (durationInFrames - transitionFrames));
  const exitOpacity = 1 - exitProgress / transitionFrames;
  const exitScale = 1 + (exitProgress / transitionFrames) * 0.05;

  const currentScale = frame < durationInFrames - transitionFrames ? enterScale : exitScale;
  const currentOpacity = frame > durationInFrames - transitionFrames ? exitOpacity : 1;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        transform: `scale(${currentScale}) translateZ(0)`,
        opacity: currentOpacity,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
};
```

---

### D. Cursor Virtual de Mouse com Clique e Efeito Ripple (`VirtualCursor`)
Simula navegação humana hiper-realista em interfaces SaaS, com aceleração em curva, repouso e clique tátil:

```tsx
import React from 'react';
import { useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from 'remotion';

interface VirtualCursorProps {
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
  const { fps } = useVideoConfig();

  // Movimento de aproximação com curva natural
  const moveProgress = interpolate(frame, [startFrame, clickFrame - 6], [0, 1], {
    easing: Easing.bezier(0.25, 1, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const posX = from.x + (to.x - from.x) * moveProgress;
  const posY = from.y + (to.y - from.y) * moveProgress;

  // Animação de clique no mouse
  const isClicking = frame >= clickFrame && frame <= clickFrame + 8;
  const clickScale = isClicking ? 0.85 : 1.0;

  // Efeito Ripple (anel de onda expansiva no clique)
  const rippleProgress = interpolate(frame, [clickFrame, clickFrame + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rippleScale = rippleProgress * 2.5;
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
      }}
    >
      {/* Seta do Cursor SVG */}
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
          fill="#0f172a"
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
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.4)',
            transform: `scale(${rippleScale}) translateZ(0)`,
            opacity: rippleOpacity,
          }}
        />
      )}
    </div>
  );
};
```

---

### E. Câmera Pan & Zoom em Elementos de Interface (`CameraPanZoom`)
Permite focar e dar zoom dramático em seções específicas da UI (como o Google Calendar, cards do Kanban ou botões de faturamento):

```tsx
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

interface CameraPanZoomProps {
  children: React.ReactNode;
  zoomStartFrame: number;
  zoomEndFrame: number;
  targetScale?: number; // Ex: 1.6 para aproximar 60%
  focusOrigin?: string; // Ex: "75% 25%" para focar no canto superior direito
}

export const CameraPanZoom: React.FC<CameraPanZoomProps> = ({
  children,
  zoomStartFrame,
  zoomEndFrame,
  targetScale = 1.45,
  focusOrigin = 'center center',
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
```

---

### F. Revelação de Texto "Palavra por Palavra" com Posição (`WordByWordText`)
Padrão visual consagrado nos vídeos do Claude e da OpenAI:

```tsx
import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

export const WordByWordText: React.FC<{
  text: string;
  startFrame: number;
  framesPerWord?: number;
  className?: string;
}> = ({ text, startFrame, framesPerWord = 6, className = 'text-5xl font-semibold text-white' }) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');

  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-2 ${className}`}>
      {words.map((word, index) => {
        const wordStart = startFrame + index * framesPerWord;
        const progress = interpolate(frame, [wordStart, wordStart + 10], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const translateY = (1 - progress) * 18;
        const opacity = progress;

        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              transform: `translate3d(0, ${translateY}px, 0)`,
              opacity,
              willChange: 'transform, opacity',
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
```

---

## 3. O Framework de 5 Passos (Método Claude / Product Video)

Ao solicitar vídeos profissionais para a IA, utilize este fluxo estruturado:

1. **Definição de Objetivo:** Qual é o produto, a dor resolvida e o público-alvo do vídeo.
2. **Descrição Cena a Cena (Shot List):** Detalhamento de cada cena com timestamps/frames, elementos visuais e ações (câmera, mouse, texto).
3. **Direcionamento de Animação e Física:** Especificação dos comportamentos de transição (ex: `WordByWordText`, zoom em 1.5x, `VirtualCursor` clicando em botão).
4. **Contextualização Visual (Referências):** Fornecer prints de tela do sistema, paleta de cores (ex: Tailwind Slate-950 + Emerald) e tipografia limpa.
5. **Protocolo de Lapidação Iterativa (Nota 6 para Nota 10):**
   * *Rodada 1:* Validação de timing, leitura e enquadramento.
   * *Rodada 2:* Ajuste de curvas de física (suavização de paradas de cursor e zoom).
   * *Rodada 3:* Polimento de micro-interações (efeito ripple, sombras e transições sonoras).

---

## 4. Integração com IA e Esquemas Zod (Motion as Code)

Para permitir que agentes de IA (Claude, GPT, Antigravity) gerem roteiros em JSON estritos e válidos para o Remotion:

```tsx
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const VideoSchema = z.object({
  headline: z.string().min(1).max(80),
  subheadline: z.string().optional(),
  highlightValue: z.number().default(100),
  primaryColor: zColor().default('#3b82f6'),
  accentColor: zColor().default('#10b981'),
  shots: z.array(
    z.object({
      id: z.string(),
      durationFrames: z.number().int().min(30),
      voiceoverText: z.string(),
      caption: z.string(),
      mediaUrl: z.string().url().optional(),
    })
  ),
});

export type VideoSchemaType = z.infer<typeof VideoSchema>;
```

---

## 5. Dores Comuns e Soluções Imediatas

| Sintoma | Causa Raiz | Solução Técnica |
| :--- | :--- | :--- |
| **Piscada/Flicker no frame 0** | Valor inicial de opacidade indefinido ou fora do clamping. | Sempre adicione `extrapolateLeft: 'clamp'` e inicie com `opacity: 0`. |
| **Vídeo engasga no Player** | Uso de `<OffthreadVideo>` no Player interativo ou re-renders excessivos do pai. | Use `<Video>` de `@remotion/media` e isole o Player com `React.memo()`. |
| **Render no Cloud/Lambda muito lento** | Uso de `filter: blur()` excessivo ou render sem GPU. | Substitua blur CSS dinâmico por assets estáticos de sombra/brilho gerados previamente. |
| **Dessincronia de Áudio** | Variação de framerate ou audio buffer sem compensação. | Use `useAudioData()` de `@remotion/media-utils` para travar keyframes no pico sonoro. |

