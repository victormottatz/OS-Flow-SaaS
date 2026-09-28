---
name: remotion_motion
description: >-
  Especialista em Motion Design, desenvolvedor Remotion e curador de pipelines de vídeo com IA.
  Aplica as regras de ouro do motion, fórmulas de interpolação/springs e componentes reutilizáveis.
---

# Remotion Motion Skill & Video Architecture

Esta skill capacita agentes e desenvolvedores a projetar, animar e renderizar vídeos e interfaces de alta performance e padrão premium no Remotion e React.

## 1. Documentos Oficiais do Projeto
- **Regras e Princípios de Animação:** [MOTION_RULES.md](file:///d:/HD/MGV/MGV_2026/OS-Flow-SaaS/docs/guias/motion/MOTION_RULES.md)
- **Receitas de Código e Componentes:** [SKILLS.md](file:///d:/HD/MGV/MGV_2026/OS-Flow-SaaS/docs/guias/motion/SKILLS.md)
- **Curadoria de Recursos, Ferramentas & Prompts:** [RESOURCES.md](file:///d:/HD/MGV/MGV_2026/OS-Flow-SaaS/docs/guias/motion/RESOURCES.md)

## 2. Padrões de Implementação Rápida

### Presets de Spring
```tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Padrão Snappy (Apple/Linear feel)
const scale = spring({
  frame,
  fps,
  config: { damping: 18, mass: 0.8, stiffness: 160 },
});
```

### Componentes Chave Disponíveis no Projeto
- `VirtualCursor`: Simulação realista de cursor de mouse com clique e efeito ripple.
- `CameraPanZoom`: Zoom cinemático focal em elementos da tela (Kanban, botões, modais).
- `WordByWordText`: Revelação de texto palavra por palavra sincronizada.
- `AnimatedCounter`: Contadores numéricos tabulares fluidos.

### Regras Mandatórias de GPU e Clamping
1. Apenas anime `transform: translate3d(...)`, `scale(...)`, `rotate(...)` e `opacity`.
2. Em todo `interpolate()`, sempre inclua `extrapolateLeft: 'clamp'` e `extrapolateRight: 'clamp'`.
3. Nunca use `@keyframes` de CSS ou `setTimeout`; todo o tempo do vídeo é dirigido matematicamente por `frame` e `fps`.

