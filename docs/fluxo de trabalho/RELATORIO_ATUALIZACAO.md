# 📋 Relatório de Atualização — Versão 1.2.0

**Projeto:** MGV Assistência Técnica em Equipamentos Estéticos  
**Data:** 31/07/2026  
**Versão Atual:** 1.2.0 (Mapeamento Completo de Caminhos & Situações)  
**Responsável:** Equipe de Desenvolvimento MGV  

---

## 1. Escopo das Modificações da Versão

Mapeamento abrangente de **todas as 14 situações operacionais e caminhos do sistema** (com base no banco Prisma e cenários da assistência técnica), expandindo o diagrama Mermaid para 18 nós, integrando 12 estados FSM com 17 transições, novos filtros no header e atalhos de teclado.

---

## 2. Estrutura de Arquivos — v1.2.0

```diff
  docs/fluxo de trabalho/
  ├── 01_PRD_REQUIREMENTS.md
  ├── 02_ARCHITECTURE_DESIGN.md
  ├── RELATORIO_ATUALIZACAO.md            ← Atualizado para v1.2.0
  ├── README.md                           ← Atualizado para v1.2.0
  ├── rolatoria_e_plano_de_ação.md        ← Atualizado para v1.2.0
  ├── SYSTEM_INSTRUCTIONS.md              ← Atualizado para v1.2.0
  ├── visualizador_fluxo.html             ← Diagrama expandido (18 nós) + Novos Filtros
  └── modules/
      ├── themeEngine.js
      ├── panZoomEngine.js
      ├── sectorFilter.js                 ← Filtros 'recusa' e 'garantia' adicionados
      ├── docViva.js                      ← Atalhos 5 e 6 + Tooltips dos 18 nós
      ├── fsmSimulator.js                 ← 12 estados e 17 transições mapeadas
      ├── telemetryDashboard.js
      └── osCrud.js                       ← Edição flexível de dados + Status Override
```

**Total:** 7 módulos JS — zero dependências externas além do Mermaid CDN.

---

## 3. Novas Funcionalidades Implementadas

### Mapeamento Completo de Caminhos (v1.2.0)

| Funcionalidade | Descrição |
|---------------|-----------|
| **18 Nós no Mermaid** | Cobre triagem, orçamento, recusa/descarte, execução, peça temporária, estresse, crediário, inadimplência/abandono (90d), finalização e garantia |
| **12 Estados no FSM** | Transições guardadas para aprovação, recusa, estresse, crediário, abandono, reabertura e garantia |
| **Edição & Override de OS** | Edição de cliente/equipamento e alteração manual de status com override no `osCrud.js` |
| **Filtros por Setor** | Novos botões de filtro no header: 🟣 **Recusa & Descarte** e 🔵 **Garantia & Audit** |
| **Atalhos 5 e 6** | Teclas `5` (Recusa) e `6` (Garantia) mapeadas no `docViva.js` |

---

## 4. Conformidade Técnica

| Área | Status |
|------|--------|
| Mermaid v10 | ✅ Regra 4 blocos respeitada |
| Acessibilidade | ✅ 22 ARIA labels no total (+4 nos novos botões CRUD) |
| Segurança | ✅ Prompt/input sanitizados com `textContent` |
| Performance | ✅ Render em < 1.5s com 18 nós |
| Design System | ✅ Cores temáticas (Gold, Red, Green, Blue, Purple) |

---

## 5. Atalhos de Teclado (atualizado)

| Tecla | Ação | Módulo |
|-------|------|--------|
| `1` | Filtro: Todos | docViva |
| `2` | Filtro: Caso Fabíola | docViva |
| `3` | Filtro: Reabertura | docViva |
| `4` | Filtro: Financeiro | docViva |
| `5` | Filtro: Recusa & Descarte | docViva |
| `6` | Filtro: Garantia & Audit | docViva |
| `+` | Zoom in | docViva |
| `-` | Zoom out | docViva |
| `0` | Zoom reset | docViva |
| `t` | Alternar tema | docViva |
| `s` | Simulador FSM | fsmSimulator |
| `d` | Dashboard | telemetryDashboard |
| `?` | Ajuda (atalhos) | docViva |
| `Esc` | Fechar modal/tooltip | docViva |

---

## 6. Resumo das Métricas v1.2.0

| Métrica | Valor |
|---------|-------|
| Total de arquivos | 9 |
| Módulos JS | 7 |
| Nós no Diagrama Mermaid | 18 |
| Estados FSM | 12 |
| Transições FSM | 17 |
| Modos de Filtro | 6 |
| ARIA labels | 22 |
| KPIs monitorados | 6 |
| Gráficos SVG | 4 |

**Status:** ✅ **v1.2.0 COMPLETA** — Todos os caminhos e situações mapeados e integrados.

---

*Atualizado em 31/07/2026*
