# 🔄 Visualizador de Fluxo de OS — MGV Assistência Técnica

Painel visual interativo do fluxo de Ordem de Serviço da **MGV Assistência Técnica em Equipamentos Estéticos**.

---

## 📌 Visão Geral

O Visualizador de Fluxo de OS é um aplicativo HTML interativo que transforma o diagrama estático de fluxo de trabalho em uma experiência visual completa, com:

- **Diagrama Mermaid.js** — Fluxo visual do ciclo de vida da OS
- **Filtros dinâmicos** — Visualizar caminhos específicos (Caso Fabíola, Reabertura, Financeiro)
- **Simulador de Estados (FSM)** — Testar transições de estados com guard conditions
- **Dashboard de Telemetria** — KPIs, gráficos SVG e métricas em tempo real
- **CRUD de OS** — Criar, selecionar e gerenciar múltiplas ordens de serviço
- **Side Panel Explicativo** — Descrição detalhada de cada etapa do fluxo
- **Design System MGV** — Identidade visual consistente (ouro, marrom, tipografia Inter)

---

## 🏗️ Arquitetura (v1.2.0)

```
visualizador_fluxo.html          ← Entry point (HTML + CSS + Mermaid 18 nós)
├── modules/
│   ├── themeEngine.js           ← Dark/Light/Print toggle
│   ├── panZoomEngine.js         ← Wheel zoom, drag pan, touch pinch
│   ├── sectorFilter.js          ← 6 modos de filtro (all, fabiola, reabertura, financeiro, recusa, garantia)
│   ├── docViva.js               ← Side panel + tooltips 18 nós + 14 atalhos
│   ├── fsmSimulator.js          ← FSM 12 estados + 17 transições + timeline
│   ├── telemetryDashboard.js    ← KPIs + gráficos SVG + real-time
│   └── osCrud.js                ← CRUD de OS (criar, editar, status override, excluir)
```

**Arquitetura modular** — Cada funcionalidade é um módulo IIFE independente. Comunicação via namespace `window.MGV` e CustomEvents.

---

## 🚀 Como Usar

### Abrir
Abra `visualizador_fluxo.html` em qualquer navegador moderno (Chrome, Firefox, Edge).

### Navegação do Diagrama
| Ação | Como fazer |
|------|-----------|
| Arrastar | Clique + arraste o fundo |
| Zoom | Scroll do mouse ou `+`/`-` |
| Zoom reset | Botão `0` ou botão na toolbar |

### Filtros (botões ou teclado)
| Filtro | Tecla | O que mostra |
|--------|-------|-------------|
| Todos | `1` | Fluxo completo (18 nós / 14 situações do sistema) |
| Caso Fabíola | `2` | Caminho: Entrada → Orçamento → Execução → Ag. Peça → Retirada Temp. → Pagamento Parcial → Finalizado |
| Reabertura | `3` | Caminho: Finalizado → Modal Justificativa → AuditLog → Reaberto → Execução |
| Financeiro | `4` | Fluxo: Entrada → Pagamento Parcial → Crediário/Boleto → Quitação → Finalizado |
| Recusa & Descarte | `5` | Fluxo: Orçamento Recusado → Devolução sem Conserto / Descarte Autorizado Oficina |
| Garantia & Audit | `6` | Fluxo: Retorno Garantia MGV/Fábrica → Isenção Mão de Obra → Reabertura Registrada |

### Tema
| Ação | Como fazer |
|------|-----------|
| Alternar tema | Botão 🌙 ou tecla `t` |
| Opções | Dark (padrão), Light, Print |

### Simulador de Estados (FSM)
| Ação | Como fazer |
|------|-----------|
| Abrir | Botão ⚙️ ou tecla `s` |
| Transição | Clique nos botões de ação disponíveis |
| Histórico | Botão 📜 (timeline) |
| Reset | Botão "Reiniciar" |

### Dashboard
| Ação | Como fazer |
|------|-----------|
| Abrir | Botão 📊 ou tecla `d` |
| Métricas | 6 KPIs + 4 gráficos SVG |
| Auto-refresh | A cada 5s (simulação) |

### Gerenciador de OS
| Ação | Como fazer |
|------|-----------|
| Selecionar OS | Use o dropdown "OS Selecionada" no painel lateral |
| Criar nova OS | Botão "➕ Nova Ordem de Serviço" |
| OS padrão | Caso Fabíola (OS 234813) — criada automaticamente |

### Ajuda
| Ação | Como fazer |
|------|-----------|
| Ver atalhos | Tecla `?` |
| Fechar modal | Tecla `Esc` |

---

## ⌨️ Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `1` | Filtro: Todos |
| `2` | Filtro: Caso Fabíola |
| `3` | Filtro: Reabertura |
| `4` | Filtro: Financeiro |
| `+` | Zoom in |
| `-` | Zoom out |
| `0` | Zoom reset |
| `t` | Alternar tema |
| `s` | Simulador FSM |
| `d` | Dashboard |
| `?` | Ajuda |
| `Esc` | Fechar modal/tooltip |

---

## 📊 Diagrama de Fluxo

O diagrama Mermaid.js representa o ciclo de vida completo da Ordem de Serviço:

```
[Entrada] → [Orçamento] → [Aprovação] → [Execução] → [Ag. Peça] → [Pronto] → [Finalizado]
    ↓                      ↓              ↓                           ↓
[Rejeição]          [Reaberto] ← [Reabertura]              [Pagamento Parcial]
```

### Estados da Matriz Tridimensional

| Dimensão | Estados |
|----------|---------|
| Status | Operacional, Em Execução, Concluído |
| Custódia | Na Oficina, Entregue Temporariamente, Entregue Definitivamente |
| Pagamento | Sem Pagamento, Parcial, Quitado |

---

## 🎨 Design System MGV

| Elemento | Valor |
|----------|-------|
| Cor principal | `--mgv-gold: #ffc107` |
| Cor secundária | `--mgv-gold-dark: #785900` |
| Cor terciária | `--mgv-brown: #5d4e37` |
| Bordas | Super Round (`rounded-full` botões, `rounded-xl` cards) |
| Fonte | Inter (Google Fonts) |
| Temas | Dark (padrão), Light, Print |

---

## 🔧 Dependências

| Dependência | Versão | Uso |
|------------|--------|-----|
| Mermaid.js | v10 | Renderização do diagrama |
| Google Fonts | — | Tipografia Inter |
| Navegador | Moderno | Chrome, Firefox, Edge |

**Sem dependências npm.** Projeto 100% standalone em HTML/CSS/JS.

---

## 📁 Documentação

| Arquivo | Descrição |
|---------|-----------|
| `01_PRD_REQUIREMENTS.md` | Requisitos do produto (15 RF + 7 RNF) |
| `02_ARCHITECTURE_DESIGN.md` | Arquitetura de módulos e segurança |
| `RELATORIO_ATUALIZACAO.md` | Relatório completo da última atualização |
| `README.md` | Este arquivo |

---

## 🧪 Conformidade

| Área | Status |
|------|--------|
| Mermaid v10 | ✅ Regra 4 blocos respeitada |
| Acessibilidade | ✅ 18 ARIA labels, focus trap, `prefers-reduced-motion` |
| Segurança | ✅ Sem eval(), innerHTML controlado |
| Performance | ✅ `<2s` render, defer scripts, throttled wheel |
| Design System | ✅ Paleta MGV, Super Round, Inter font |

---

## 📈 Métricas

| Métrica | Valor |
|---------|-------|
| Total de arquivos | 9 |
| Módulos JS | 7 |
| Atalhos de teclado | 12 |
| KPIs monitorados | 6 |
| Gráficos SVG | 4 |
| Estados FSM | 7 |
| Transições FSM | 9 |
| Tooltips | 13 |
| ARIA labels | 18 |

---

## 📞 Contato

**MGV Assistência Técnica em Equipamentos Estéticos**  
Desenvolvido com suporte de Assistente IA

---

*Última atualização: 31/07/2026 — v1.1.0*
