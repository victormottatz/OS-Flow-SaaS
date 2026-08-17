# Arquitetura — Visualizador Interativo do Fluxo de OS

## 1. Estrutura de Componentes

```
docs/fluxo de trabalho/
├── visualizador_fluxo.html          ← Arquivo principal (SFA)
├── 01_PRD_REQUIREMENTS.md          ← Requisitos do projeto
├── 02_ARCHITECTURE_DESIGN.md       ← Este arquivo
├── 03_TASKS_VERIFICATION.md        ← Checklists de tarefas
├── 04_REVIEW_RELEASE.md            ← Code Review & Release
└── modules/
    ├── themeEngine.js               ← Task 1.1: Engine de Temas CSS
    ├── panZoomEngine.js             ← Task 1.2: Pan & Zoom
    ├── sectorFilter.js              ← Task 1.3: Filtro por Setor
    ├── nodeDocsData.js              ← Task 2.1: Dados dos Modais
    ├── prismaPlayground.js          ← Task 2.2: Prisma Playground
    ├── exportEngine.js              ← Task 2.3: Exportação SVG/PNG
    ├── stateSimulator.js            ← Task 3.1: Simulador FSM
    ├── financeCalculator.js         ← Task 3.2: Calculadora Financeira
    ├── mermaidEditor.js             ← Task 3.3: Editor Mermaid Live
    ├── telemetryAdapter.js          ← Task 4.1: Contrato API
    ├── metricBadges.js              ← Task 4.2: Badges SVG
    └── slaAlerts.js                 ← Task 4.3: Alertas SLA
```

## 2. Design System MGV

### 2.1 Paleta de Cores

```css
:root {
  /* MGV Brand */
  --mgv-gold: #ffc107;
  --mgv-gold-dark: #785900;
  --mgv-gold-light: #fabd00;
  --mgv-brown: #5d4e37;

  /* Dark Theme (padrão) */
  --bg-main: #0f172a;
  --bg-card: #1e293b;
  --bg-card-hover: #334155;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --accent-blue: #38bdf8;
  --accent-red: #f87171;
  --accent-green: #4ade80;
  --accent-purple: #c084fc;
  --border-color: #334155;

  /* Light Theme */
  --bg-main-light: #fafafa;
  --bg-card-light: #ffffff;
  --text-main-light: #1e293b;
  --text-muted-light: #64748b;
  --border-color-light: #e2e8f0;
}
```

### 2.2 Tipografia

- **Fonte principal:** Inter (Google Fonts)
- **Weights:** 300, 400, 500, 600, 700, 800
- **Preconnect:** `fonts.googleapis.com` + `fonts.gstatic.com` (crossorigin)

### 2.3 Bordas & Componentes (Super Round)

| Componente | Classe | Estilo |
|---|---|---|
| Botões | `.btn` | `border-radius: 9999px` (rounded-full) |
| Cards | `.panel-card` | `border-radius: 12px` (rounded-xl) |
| Badges | `.badge` | `border-radius: 4px` |
| Inputs | `.input` | `border-radius: 9999px` (rounded-full) |
| Modais | `.modal-content` | `border-radius: 16px` (rounded-2xl) |

### 2.4 Sombras & Efeitos

```css
/* Glassmorphism */
backdrop-filter: blur(12px);
background: rgba(30, 41, 59, 0.85);

/* Elevação */
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

/* Hover */
transform: translateY(-1px);
transition: all 0.2s ease;
```

## 3. Fluxo de Dados

### 3.1 Arquitetura de Módulos

```
visualizador_fluxo.html
├── <script src="modules/themeEngine.js"></script>
├── <script src="modules/panZoomEngine.js"></script>
├── <script src="modules/sectorFilter.js"></script>
├── <script src="modules/nodeDocsData.js"></script>
├── <script src="modules/prismaPlayground.js"></script>
├── <script src="modules/exportEngine.js"></script>
├── <script src="modules/stateSimulator.js"></script>
├── <script src="modules/financeCalculator.js"></script>
├── <script src="modules/mermaidEditor.js"></script>
├── <script src="modules/telemetryAdapter.js"></script>
├── <script src="modules/metricBadges.js"></script>
└── <script src="modules/slaAlerts.js"></script>
```

### 3.2 Ordem de Carregamento

1. **Core CSS** (inline no `<head>`) — Design System MGV
2. **Mermaid.js** (CDN) — `<script>` com `defer`
3. **Google Fonts** (CDN) — `<link>` com `preconnect`
4. **Módulos JS** (pasta `modules/`) — `<script>` tags na ordem:
   - `themeEngine.js` (primeiro — aplica tema antes do render)
   - `panZoomEngine.js`
   - `sectorFilter.js`
   - Demais módulos (carregam sob demanda)

### 3.3 Comunicação entre Módulos

```
window.MGV = {
  theme: ThemeEngine,        // Tema atual, toggle, persistência
  zoom: PanZoomEngine,       // Zoom level, fit, center
  filter: SectorFilter,      // Filtro ativo, nós visíveis
  simulator: StateSimulator, // Estado atual, histórico, transições
  finance: FinanceCalculator,// Saldo, pagamentos, status
  telemetry: TelemetryAdapter// Dados de telemetria, WebSocket
};
```

## 4. Mermaid v10 Rules (Inviolável)

```javascript
// BLOCO 1: classDef (ANTES de qualquer nó)
classDef padrao fill:#1e3a8a,stroke:#3b82f6,color:#fff,stroke-width:2px;

// BLOCO 2: Definição de Nós
ENTRADA(["1. Entrada da OS"])

// BLOCO 3: Conexões (SEM :::classe inline)
ENTRADA --> AVALIACAO

// BLOCO 4: Atribuição de Classes (DEPOIS das conexões)
class ENTRADA,AVALIACAO padrao;
```

**NUNCA usar:**
```javascript
// ERRADO - causa bug de render no Mermaid v10
ENTRADA(["1. Entrada da OS"]) :::padrao --> AVALIACAO["2. Triagem"] :::padrao
```

## 5. Segurança

| Vetor | Mitigação |
|---|---|
| XSS no Search | Usar `textContent`, nunca `innerHTML` com dados do usuário |
| Prisma Playground | Sanitizar input, exibir código como texto (não executar) |
| Mermaid Editor | Validar syntax antes de render, debounce 500ms |
| Exportação PNG | Usar `toBlob()` (não `toDataURL`) para evitar memory leak |

## 6. Performance

| Otimização | Implementação |
|---|---|
| Font loading | `preconnect` + `font-display: swap` |
| Mermaid CDN | `defer` para não bloquear render |
| Pan/Zoom | Throttling wheel events (16ms = 60fps) |
| Badges SVG | Lazy load via Intersection Observer |
| Telemetria | Polling 30s + WebSocket upgrade |
| Exportação | Debounce no SVG serialize |
