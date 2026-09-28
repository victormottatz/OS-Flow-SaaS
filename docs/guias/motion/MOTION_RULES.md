# 🎬 Diretrizes e Regras de Ouro de Motion Design (Remotion Premium)

> **Objetivo:** Estabelecer a régua de excelência visual e técnica para todas as animações e vídeos programáticos gerados no ecossistema **Remotion** e **React Motion**, garantindo estética de alto padrão (*Apple-grade / Linear-grade*), física fluida e renderização performática.

---

## 1. Filosofia: O Padrão "Premium" de Motion

Animações amadoras são duras, lineares, caóticas ou excessivamente lentas. Animações **premium** são:
1. **Intencionais:** Cada movimento guia a atenção do olho para o próximo elemento relevante (hierarquia visual).
2. **Baseadas em Física (Springs):** O mundo real possui peso, inércia e resistência do ar. Quase nada desacelera em linha reta.
3. **Snappy & Confiáveis:** Elementos entram rápido (150ms a 350ms) e assentam suavemente sem oscilações cansativas.
4. **Sem Perda de Quadros (60 FPS):** Código de animação só mexe em propriedades compostas pela GPU (`transform` e `opacity`).

---

## 2. As Curvas de Ouro (Easing & Springs)

### A. Springs Físicos (`spring()` do Remotion)
No Remotion, dê preferência a `spring()` em vez de `interpolate` linear para elementos de interface, pop-ins, botões e cards.

```tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Configuração Padrão Snappy (Linear / Apple Feel)
const scale = spring({
  frame,
  fps,
  config: {
    damping: 18,    // Amortecimento: evita bounce excessivo infantil
    mass: 0.8,       // Peso do objeto: ágil para arrancar
    stiffness: 150,  // Tensão: movimento vivo e responsivo
    overshootClamping: false, // Permite micro-overshoot orgânico (1-2%)
  },
});
```

#### Tabela de Presets de Springs Oficiais

| Estilo | Mass | Stiffness | Damping | Caso de Uso Recomendado |
| :--- | :---: | :---: | :---: | :--- |
| **Snappy / UI Standard** | `0.8` | `160` | `18` | Entrada de cards, diálogos, números e badges. |
| **Smooth Cinematic** | `1.2` | `80` | `24` | Movimentos de câmera, reveals de logos, fades de fundo. |
| **Bouncy Accent** | `0.5` | `180` | `10` | Micro-ícones de sucesso, checkmarks, notificações. |
| **Subtle Float** | `2.0` | `40` | `30` | Efeito flutuante perpétuo, respiração de elementos 3D. |

---

### B. Curvas Bezier Cinematográficas (`Easing.bezier`)
Quando usar `interpolate()`, **nunca** use animação linear, a menos que seja para rotação contínua (ex: spinners) ou progresso de tempo real.

```tsx
import { interpolate, Easing } from 'remotion';

// 💎 Curva "Quintic Out" (Ultra Premium - Entrada suave)
const progress = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

*   **Entrada de Cenas:** `Easing.bezier(0.16, 1, 0.3, 1)` (Arranca veloz, freia cinematograficamente).
*   **Saída de Elementos:** `Easing.bezier(0.7, 0, 0.84, 0)` (Acelera para fora da tela sem enrolação).
*   **Transições Contínuas:** `Easing.bezier(0.65, 0, 0.35, 1)` (Curva cúbica suave).

---

## 3. Os 12 Princípios do Motion Aplicados ao Código

1. **Squash & Stretch (Achatamento e Alongamento):**
   * Ao fazer um card aterrissar em `scale: 1`, varie temporariamente `scaleX: 1.04` e `scaleY: 0.96` antes do repouso.
2. **Anticipation (Antecipação):**
   * Antes de um pop-up disparar para cima, faça-o recuar 3 a 5 pixels para baixo ou encolher 2% por 3 a 5 frames.
3. **Staging (Encenação):**
   * Apenas **um** elemento principal deve capturar a atenção a cada momento. Nunca faça 5 blocos diferentes pipocarem juntos sem escalonamento (*stagger*).
4. **Follow Through & Overlapping (Continuidade e Sobreposição):**
   * Título entra no frame 0. Subtítulo entra no frame 6. Botão entra no frame 12.
   * O texto para primeiro, mas a sombra ou o brilho de fundo termina de se acomodar 5 frames depois.
5. **Slow In and Slow Out (Aceleração e Desaceleração):**
   * Todo início e término de movimento é suavizado por `spring` ou `Easing.out`.
6. **Arcs (Arcos Naturais):**
   * Elementos voando pela tela nunca se movem em diagonal reta 45°. Aplique curvas combinando eixos X e Y com durações e easings levemente dessincronizados.
7. **Secondary Action (Ação Secundária):**
   * Quando uma janela entra em cena, um gradiente sutil de luz (*sheen/shimmer*) desliza sobre o vidro (efeito glassmorphism).
8. **Timing (Tempo e Ritmo):**
   * Ações rápidas transmitem precisão e tecnologia; ações lentas transmitem elegância e peso.
9. **Exaggeration (Exagero dosado):**
   * Para dar impacto a uma métrica ou número ("+45%"), faça o contador ultrapassar ligeiramente a escala (ex: escala 1.1) e retornar a 1.0.
10. **Solid Drawing (Peso Visual e Espacialidade):**
    * Use sombras com desfoque progressivo (`box-shadow: 0 20px 40px rgba(0,0,0,0.3)`) para dar tridimensionalidade crível.
11. **Appeal (Carisma e Polimento):**
    * Cores vibrantes com fundo escuro (Dark Mode Neon / Slate), tipografia com kerning ajustado e micro-brilhos sutis.

---

## 4. Regras Técnicas de Performance no Remotion

### 🚨 Regra 1: Apenas Propriedades GPU
- **PROIBIDO animar:** `width`, `height`, `top`, `left`, `margin`, `padding`, `filter: blur(...)` em alta frequência no cloud.
- **OBRIGATÓRIO animar:** `transform` (`translate3d`, `scale`, `rotate`) e `opacity`.
- **Dica:** Ative aceleração de hardware forçada:
  ```css
  will-change: transform, opacity;
  transform: translateZ(0);
  ```

### 🚨 Regra 2: Sempre Usar Clamping
Toda chamada `interpolate()` DEVE definir explicitamente o extrapolamento para evitar que valores vazem fora dos limites da cena:
```tsx
extrapolateLeft: 'clamp',
extrapolateRight: 'clamp',
```

### 🚨 Regra 3: Memoização e Matemática Precomputada
- Remotion renderiza componente a cada frame. Cálculos pesados (loops, parsing de dados, manipulação de strings de SVGs complexos) devem usar `useMemo()` referenciando o frame ou serem pré-calculados em tabelas de lookup (*lookup tables*).

### 🚨 Regra 4: Assets e Vídeos
- Em composições no player interativo, use `<Video />` de `@remotion/media`.
- Pré-carregue imagens e mídias pesadas com `prefetch()` para evitar quadros em branco durante o preview ou render.

---

## 5. Checklist de Qualidade Antes de Aprovar uma Cena

- [ ] O movimento é suave e não engasga visualmente?
- [ ] O easing utilizado é orgânico (não-linear)?
- [ ] Há escalonamento (*stagger*) entre os elementos em vez de estouro simultâneo?
- [ ] O contraste visual e tipografia atendem ao padrão *high-end*?
- [ ] Não há vazamento de frames ou elementos piscando fora do tempo (*flicker*)?
- [ ] Todas as transformações usam aceleração por GPU (`translate3d`)?

---

## 6. Protocolo de Lapidação Iterativa (Do Rascunho "Nota 6" à Entrega "Nota 10")

Na geração de vídeos assistida por IA (Remotion + LLM), a primeira resposta é estruturalmente correta, mas visualmente crua (**Nota 6**). O padrão de excelência é atingido através de rodadas direcionadas de refinamento:

1. **Rodada 1 - Arquitetura & Timing (Nota 6 ➔ 7.5):**
   * Validar se a sequência das cenas conta a história com clareza.
   * Ajustar durações que parecem longas demais ou apressadas (leitura confortável de texto).
2. **Rodada 2 - Dinâmica de Câmera e Mouse (Nota 7.5 ➔ 9.0):**
   * Substituir cortes secos por `CameraPanZoom` nos elementos-chave da interface.
   * Suavizar o `VirtualCursor` para fazer arcos naturais com curvas de Bézier e efeito ripple no clique.
3. **Rodada 3 - Micro-Física & Atmosfera (Nota 9.0 ➔ 10.0):**
   * Substituir qualquer transição linear residual por `spring` com amortecimento ajustado.
   * Adicionar ação secundária (micro-sombras, reflexos e revelação *word-by-word* de texto).

