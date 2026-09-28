# 🌐 Radar & Curadoria de Recursos: Remotion, Motion Design & IA de Vídeo

> **Arquivo:** `RESOURCES.md`  
> **Objetivo:** Guia consolidado de ferramentas, repositórios de referência, bibliotecas complementares, otimização de performance e técnicas de prompt engineering para produção programática de vídeos com IA e Remotion.

---

## 1. Curadoria de Ferramentas & Bibliotecas Auxiliares

### A. Pacotes Oficiais Essenciais do Remotion
| Pacote | Função no Pipeline | Como Usar no Fluxo |
| :--- | :--- | :--- |
| **`@remotion/media-utils`** | Análise e sincronia de áudio/vídeo em tempo real. | Extração de picos de batida (*waveforms*, frequências FFT) com `useAudioData()` para fazer elementos pulsarem com a trilha sonora. |
| **`@remotion/captions`** | Renderização precisa de legendas com sincronia de frames. | Geração de legendas automáticas estilo TikTok/Reels com destaque de cor na palavra ativa em sincronia milimétrica. |
| **`@remotion/animated-text`** | Animação automática de tipografia e textos. | Efeitos de máquina de escrever, deslizamento por palavra e rotação de títulos sem necessidade de cálculos manuais. |
| **`@remotion/paths`** | Interpolação e morphing de vetores SVG. | Animação de traçados de ícones, gráficos vetoriais e desenhar linhas animadas em mapas ou dashboards. |
| **`@remotion/shapes`** | Componentes primitivos vetoriais (círculos, retângulos, estrelas). | Construção de partículas visuais, backgrounds geométricos e confetes. |
| **`@remotion/motion-blur`** | Desfoque de movimento artificial calculado. | Adiciona sensação de velocidade de cinema em movimentos rápidos de cards ou câmeras. |
| **`@remotion/tailwind`** | Suporte de utilitários TailwindCSS no Remotion. | Estilização ultra-rápida de componentes de vídeo usando a mesma biblioteca do projeto web. |
| **`@remotion/three`** | Renderização de cenas 3D via Three.js e React Three Fiber. | Modelos 3D giratórios, câmeras orbitais e mockups de produtos interativos dentro do vídeo. |
| **`@remotion/zod-types`** | Tipagem e validação de propriedades de vídeo com Zod. | Cria o contrato estrito de props para que a IA gere dados que o vídeo aceita sem quebrar. |

---

### B. Stack de Inteligência Artificial para Vídeo
1. **Síntese de Voz (TTS) com Timestamps:**
   * **[ElevenLabs API](https://elevenlabs.io/):** Padrão da indústria para vozes humanas. O endpoint de geração com timestamps por caractere (`alignment`) permite sincronizar cortes de vídeo e legendas com precisão cirúrgica de milissegundos.
2. **Transcrição e Alinhamento de Legendas:**
   * **OpenAI Whisper / [Deepgram Nova-2](https://deepgram.com/):** Transcrição ultrarrápida com marcação de tempo por palavra, fornecendo o JSON ideal para alimentar o `@remotion/captions`.
3. **Geração de Imagens & B-Rolls:**
   * **[Fal.ai](https://fal.ai/) & [Replicate](https://replicate.com/) (FLUX.1 Schnell/Dev):** Geração de imagens fotorrealistas em menos de 1 segundo para servirem de planos de fundo e ilustrações dinâmicas nas cenas do vídeo.
4. **Agentes de Roteiro e Orquestração:**
   * **Anthropic Claude 3.5 Sonnet / OpenAI GPT-4o:** Ideais para atuar como *Screenwriters*, transformando um briefing bruto de texto em um JSON estruturado com lista de cenas (*Shot List*), tempos e props.

---

## 2. Monitoramento do Ecossistema (GitHub & Comunidade)

### Repositórios e Boilerplates Notáveis

*   🔥 **[ali-abassi/remotion-templates](https://github.com/ali-abassi/remotion-templates):**  
    Biblioteca com mais de 1.000 templates reutilizáveis divididos em 100 *family engines*. Projetado especificamente para agentes de IA de código com receitas e pré-visualizações prontas.
*   🧠 **[manalkaff/remotion-prompts](https://github.com/manalkaff/remotion-prompts):**  
    Coleção curada de prompts avançados para LLMs (como Claude Code e Antigravity) gerarem animações Remotion complexas (animações de prints, mapas, telas de produto e motion cards).
*   🚀 **[itsjwill/vanta](https://github.com/itsjwill/vanta):**  
    Engine de vídeo open source completo baseado em Remotion com suporte a agentes autônomos, clonagem de voz, avatares falantes e legendas automáticas em pipeline único.
*   🎥 **[Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft):**  
    Framework com 150+ receitas de cortes (*shot cards*) e 200+ pré-visualizações de movimentos de câmera para criar vídeos de produto cinematográficos.
*   🛠️ **Remotion Agent Skills (`npx remotion skills add`):**  
    Comando oficial do Remotion para instalar regras e conhecimentos de compilação diretamente em IDEs agenticas.
*   🎯 **[Remotion Springs Visualizer](https://springs.remotion.dev/):**  
    Editor interativo no navegador para ajustar visualmente valores de `mass`, `stiffness` e `damping` antes de colar o código no projeto.

---

## 3. Dicas de Otimização e Melhores Práticas

### A. Performance de Renderização (Local e Serverless)
1. **Descubra a Concorrência Ideal:**
   Execute o benchmark oficial para testar quantos processos paralelos sua CPU (ou container) aguenta sem estrangular a memória:
   ```bash
   npx remotion benchmark
   ```
2. **Otimização de Áudio na Renderização:**
   Se a prioridade for velocidade bruta de render, renderize o áudio com o codec `mp3` em vez de `aac`, pois consome menos processamento durante a fusão do FFmpeg.
3. **Remotion Lambda / Cloud Run:**
   * Use `speculateFunctionName()` para economizar chamadas de verificação na AWS.
   * Defina `overwrite: true` em `renderMediaOnLambda()` para pular checagens redundantes no bucket S3.
   * Evite filtros pesados de CSS como `backdrop-filter: blur()` ou `filter: drop-shadow()` em renderizadores sem aceleração gráfica por hardware (GPU).

---

### B. Práticas no Código do Componente
*   **Memoização Agressiva:** Remotion executa o componente a cada quadro. Coloque `React.memo()` nos componentes secundários e `useMemo()` em transformações de vetores ou arrays de dados.
*   **Prefetch de Ativos:** Use `prefetch(assetUrl)` para evitar engasgos ou congelamentos no preview do player durante a troca de cenas.
*   **Apenas Propriedades Compostas pela GPU:** Altere exclusivamente `transform: translate3d(...)`, `scale(...)`, `rotate(...)` e `opacity`. Jamais altere `top`, `left`, `width` ou `height` diretamente em keyframes.

---

## 4. Técnicas de Prompt Engineering para Motion Design

Para que uma IA (ou você mesmo interagindo com o agente) gere vídeos de qualidade profissional no Remotion sem erros sintáticos ou animações amadoras:

### A. Template de Prompt do Agente Especialista

```markdown
Você é um Engenheiro de Motion Design e Especialista Remotion. 
Ao escrever componentes de vídeo:
1. NUNCA use CSS animations com @keyframes ou setTimeout.
2. TODA animação deve ser dirigida matematicamente por `useCurrentFrame()` e `useVideoConfig()`.
3. Para movimentos de interface e cards, use SEMPRE a função `spring()` com damping entre 16 e 20 e stiffness entre 120 e 180 para evitar bounciness amador.
4. Ao usar `interpolate()`, NUNCA esqueça de definir `extrapolateLeft: 'clamp'` e `extrapolateRight: 'clamp'`.
5. Garanta que todas as transições de elementos usem transformações 3D aceleradas por hardware (`translate3d(x, y, 0)`).
6. Estruture as cores com alto contraste visual (Dark Mode moderno, textos brancos e cores de destaque vibrantes como Emerald, Cyan ou Indigo).
```

### B. Arquitetura em Duas Etapas: "Roteiro em JSON" + "Engine Remotion"
Nunca peça para a IA gerar o código inteiro do zero a cada vídeo. Siga o padrão de arquitetura desacoplada:
1. **Passo 1 (Roteiro em JSON via IA):** A IA gera apenas o JSON de dados (títulos, valores, tempo de cada cena, texto de locução).
2. **Passo 2 (Engine Remotion Fixo):** Seu componente Remotion consome o JSON validado por Zod e renderiza a composição com física e estética perfeitas.

---

### C. O Framework de 5 Passos (Método Claude / Product Video)

Estrutura ideal para obter vídeos com acabamento profissional e animações cinematográficas de SaaS:

```markdown
# 🎯 BRIEFING DE VÍDEO PROGRAMÁTICO (5 PASSOS)

1. OBJETIVO:
   Criar um vídeo promocional curto (30s, 900 frames a 30fps) destacando a velocidade de encerramento de Ordens de Serviço com emissão automática de NF-e/NFC-e no OS-Flow SaaS.

2. DESCRIÇÃO CENA A CENA (SHOT LIST):
   - Cena 1 (0s-4s / 120f): Visão geral do Kanban com cards de OS organizados por status.
   - Cena 2 (4s-9s / 150f): O cursor do mouse desliza em curva até o card "OS #1042 - Autoclave Cristófoli", arrasta até a coluna "FINALIZADO".
   - Cena 3 (9s-15s / 180f): Modal de Checkout Financeiro abre com spring suave. Câmera dá zoom de 1.4x no botão "Emitir NF-e Bling".
   - Cena 4 (15s-21s / 180f): Clique no botão, surge ripple azul e em 1.5s surge o badge animado verde "NF-e #4819 Emitida com Sucesso".
   - Cena 5 (21s-26s / 150f): Contador numérico exibe faturamento saltando suavemente com prefixo "R$".
   - Cena 6 (26s-30s / 120f): Logo do OS-Flow centralizado com revelação de slogan e chamada de ação (CTA).

3. DIRECIONAMENTO DE ANIMAÇÃO:
   - Texto: Utilize `WordByWordText` com transição de subida de 18px e opacidade gradual.
   - Mouse: Utilize `VirtualCursor` com easing bezier natural e animação de clique no frame exato.
   - Câmera: Utilize `CameraPanZoom` na Cena 3 com ponto focal no canto inferior direito do modal.
   - Molas: Todas as aberturas de modais devem usar o preset de spring "snappy" (damping: 18, mass: 0.8, stiffness: 160).

4. CONTEXTUALIZAÇÃO VISUAL:
   - Cores: Fundo Dark Slate (#020617), Acentos em Emerald (#10b981) e Cyan (#06b6d4).
   - Estilo: Vidro jateado (*glassmorphism* com bordas sutis `border-white/10`).

5. PROCESSO DE LAPIDAÇÃO (ITERAÇÃO):
   - Primeira entrega: Rascunho funcional de timing.
   - Rodada 2: Refinar aceleração do mouse e velocidade do zoom.
   - Rodada 3: Efeitos sonoros, micro-sombras e ajuste milimétrico de repouso.
```

---

## 5. Como Manter Este Arquivo Atualizado

*   **Rotina Mensal:** Solicite: *"Atualize o `RESOURCES.md` com as novidades mais recentes do ecossistema Remotion, novos repositórios do GitHub e bibliotecas de IA lançadas este mês."*
*   **Solução de Dores Específicas:** Ao enfrentar travamentos ou dúvidas de animação, consulte as seções 1 e 3 deste documento ou solicite a expansão com novos presets no `SKILLS.md`.
