# PRD — Visualizador Interativo do Fluxo de OS (MGV Assistência Técnica)

## 1. Visão Geral & Objetivos

- **Nome do Projeto:** Visualizador Interativo do Fluxo de OS
- **Objetivo:** Criar um painel visual interativo que mapeia o fluxo completo de uma Ordem de Serviço (OS) da MGV Assistência Técnica, desde a entrada até a finalização, incluindo cenários especiais (retirada temporária, reabertura, gestão financeira).
- **Público-Alvo:** Técnicos, atendentes e gestores da MGV Assistência Técnica em Ribeirão Preto.
- **Contexto de Negócio:** A MGV gerencia equipamentos estéticos com fluxo trifásico (Operacional → Custódia → Financeiro). O visualizador serve como ferramenta de treinamento, auditoria e operação diária.
- **Base de Dados:** Caso real OS 234813 (Cliente Fabíola) — retirada temporária com pagamento parcial.

## 2. Requisitos Funcionais

### 2.1 Fase 1 — UX & Canvas

| ID | Requisito | Prioridade |
|---|---|---|
| RF-01 | Theme Engine com 3 temas: Dark (padrão), Light, Print (alto contraste) | Alta |
| RF-02 | Persistência de tema选择ida via `localStorage` | Alta |
| RF-03 | Pan & Zoom com mouse wheel, botões +/-, indicador de zoom % | Alta |
| RF-04 | Filtro por setor: Botões que destacam nós por classe CSS (fabiola, reabertura, financeiro, auditoria) | Alta |
| RF-05 | Indicador visual de zoom atual (badge no canto inferior) | Média |

### 2.2 Fase 2 — Documentação Viva

| ID | Requisito | Prioridade |
|---|---|---|
| RF-06 | Modais técnicos: Click em nó → modal com backend files, APIs, regras de negócio | Alta |
| RF-07 | Prisma Playground: Painel lateral com código Prisma reativo ao cenário selecionado | Média |
| RF-08 | Exportação: SVG download, Canvas→PNG, JSON dump do estado atual | Média |
| RF-09 | Trap de foco em modais (A11y): Tab não escapa, ESC fecha | Alta |

### 2.3 Fase 3 — Simulador FSM

| ID | Requisito | Prioridade |
|---|---|---|
| RF-10 | Simulador de estados: Selecionar cenário → animação do fluxo com highlighting | Alta |
| RF-11 | Calculadora financeira interativa: Campos reativos que atualizam saldo e status | Alta |
| RF-12 | Editor Mermaid Live: Textarea com debounce + re-render do diagrama | Média |

### 2.4 Fase 4 — Telemetria

| ID | Requisito | Prioridade |
|---|---|---|
| RF-13 | Badges SVG sobre nós: Tempo médio, contagem de OS, alertas de SLA | Média |
| RF-14 | Alertas visuais: Nós com SLA violado ficam pulsantes (vermelho) | Média |
| RF-15 | Contrato API: Fetch polling 30s + WebSocket upgrade para `/api/metrics/os-flow` | Baixa |

## 3. Requisitos Não-Funcionais

| ID | Requisito | Especificação |
|---|---|---|
| RNF-01 | Performance | Mermaid renderiza < 2s em mobile (375px). Badges SVG < 500ms. |
| RNF-02 | Acessibilidade (WCAG 2.1) | Todos os botões com `aria-label`. Modais com `role="dialog"`. Foco visível com `ring-2`. Navegação por teclado completa. |
| RNF-03 | Design System | Paleta MGV: `--mgv-gold: #ffc107`, `--mgv-gold-dark: #785900`, `--mgv-brown: #5d4e37`. Fonte Inter. Cantos arredondados (`rounded-full` botões, `rounded-xl` cards). |
| RNF-04 | Segurança | Search usa `textContent` (não `innerHTML`). Prisma Playground sanitiza input. Nenhum código arbitrário executado. |
| RNF-05 | Print/PDF | Ctrl+P gera PDF limpo: tema claro, sem sidebar, diagrama centralizado. |
| RNF-06 | Modularização | Arquitetura SFA com `<script>` tags para módulos JS separados. |
| RNF-07 | Mermaid v10 | Regra inviolável: 4 blocos separados (classDef → nodes → connections → class assignments). Nunca `:::class` inline com `-->`. |

## 4. Matriz Tridimensional de Estados

| Dimensão | Campo | Enum | Valores |
|---|---|---|---|
| **Operacional** | `status` | `StatusOS` | `AGUARDANDO_ORCAMENTO`, `AGUARDANDO_APROVACAO`, `AGUARDANDO_PECA`, `EM_EXECUCAO`, `PRONTO_RETIRADA`, `FINALIZADO`, `REABERTO` |
| **Custódia** | `custodyStatus` | `OSCustodyStatus` | `NA_OFICINA`, `ENTREGUE_TEMP`, `ENTREGUE_DEFINITIVO` |
| **Financeiro** | `paymentStatus` | `PaymentStatus` | `PENDENTE`, `PAGO_PARCIAL`, `PAGO_TOTAL` |

### Virtual Field Layer (sem alterar Prisma schema em produção)

```javascript
const CUSTODY_VIRTUAL_MAP = {
  AGUARDANDO_ORCAMENTO: 'NA_OFICINA',
  AGUARDANDO_APROVACAO: 'NA_OFICINA',
  AGUARDANDO_PECA: 'NA_OFICINA',
  EM_EXECUCAO: 'NA_OFICINA',
  PRONTO_RETIRADA: 'NA_OFICINA',
  FINALIZADO: 'ENTREGUE_DEFINITIVO',
  REABERTO: 'NA_OFICINA',
};
// Caso especial: quando billingStatus = PAGO_PARCIAL → ENTREGUE_TEMP
```

## 5. Fluxo de Trabalho ANWS

```
Especificação (este PRD)
    ↓
Arquitetura (02_ARCHITECTURE_DESIGN.md)
    ↓
Tarefas & Verificação (Checklists por fase)
    ↓
Execução de Código (Módulos JS + CSS)
    ↓
Validação (npx live-server + Checklist QA)
    ↓
Code Review (04_REVIEW_RELEASE.md)
```

## 6. Critérios de Aceite

- [ ] Temas Dark/Light/Print funcionam com persistência em `localStorage`
- [ ] Pan & Zoom fluido em mobile (375px) e desktop (1280px)
- [ ] Filtros por setor destacam apenas os nós relevantes
- [ ] Modais técnicos abrem com foco preso e ESC fecha
- [ ] Prisma Playground exibe código reativo sem executar nada
- [ ] Exportação SVG/PNG funciona em < 5s
- [ ] Simulador FSM anima o fluxo completo do caso Fabíola
- [ ] Calculadora financeira atualiza saldo em tempo real
- [ ] Todos os botões têm `aria-label` e `focus:ring-2`
- [ ] PDF impresso é limpo com tema claro
- [ ] Mermaid v10 rules respeitadas (4 blocos separados)
- [ ] Nenhum `innerHTML` com dados do usuário (XSS prevention)
