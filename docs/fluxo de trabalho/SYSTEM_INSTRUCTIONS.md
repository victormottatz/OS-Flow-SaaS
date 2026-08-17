# 📋 System Instructions — Visualizador de Fluxo de OS

**Para:** Agente de Planejamento de Desenvolvimento  
**Projeto:** MGV Assistência Técnica  
**Contexto:** Continuidade do desenvolvimento do Visualizador de Fluxo de OS

---

## 1. Visão do Projeto

Você está assumindo o planejamento de desenvolvimento de um **Visualizador HTML Interativo** do fluxo de Ordem de Serviço (OS) da MGV Assistência Técnica em Equipamentos Estéticos.

O sistema já possui:
- **Prisma Schema em produção** — não pode ser modificado
- **Sistema de OS existente** — com statuses, custódia e pagamento
- **Diagrama Mermaid.js** — fluxo visual do ciclo de vida da OS

Seu papel é **planejar novas funcionalidades** sem quebrar o que já existe.

---

## 2. Estado Atual (v1.2.0 — Completa)

### Arquivos Existentes

```
docs/fluxo de trabalho/
├── 01_PRD_REQUIREMENTS.md              ← Requisitos do produto (PRD)
├── 02_ARCHITECTURE_DESIGN.md           ← Arquitetura de módulos
├── RELATORIO_ATUALIZACAO.md            ← Relatório da última atualização (v1.2.0)
├── README.md                           ← Visão geral do projeto (v1.2.0)
├── rolatoria_e_plano_de_ação.md        ← Diagnóstico e Plano de Ação (v1.2.0)
├── visualizador_fluxo.html             ← Entry point (HTML + CSS + Mermaid 18 nós)
└── modules/
    ├── themeEngine.js                  ← Dark/Light/Print toggle
    ├── panZoomEngine.js                ← Wheel/Drag/Touch zoom
    ├── sectorFilter.js                 ← 6 modos de filtro (all, fabiola, reabertura, financeiro, recusa, garantia)
    ├── docViva.js                      ← Side panel + tooltips 18 nós + 14 atalhos
    ├── fsmSimulator.js                 ← FSM 12 estados + 17 transições + timeline
    ├── telemetryDashboard.js           ← KPIs + gráficos SVG + real-time
    └── osCrud.js                       ← CRUD de OS + Edição flexível + Override de Status (v1.2.0)
```

### Funcionalidades Implementadas

| Fase | Módulo | Status |
|------|--------|--------|
| 0 | Design System MGV | ✅ Completo |
| 1 | themeEngine, panZoomEngine, sectorFilter (6 modos) | ✅ Completo |
| 2 | docViva (side panel, tooltips dos 18 nós, 14 atalhos de teclado) | ✅ Completo |
| 3 | fsmSimulator (12 estados, 17 transições, timeline histórica) | ✅ Completo |
| 4 | telemetryDashboard (6 KPIs, 4 gráficos SVG, real-time) | ✅ Completo |
| 5 | osCrud (CRUD de OS, edição flexível, status override, localStorage) | ✅ Completo |

---

## 3. Regras Invioláveis

### 3.1 Prisma Schema
```diff
- NÃO MODIFIQUE O SCHEMA PRISMA
- O schema está em produção e não pode ser alterado
- Custódia (custodyStatus) é tratada via CUSTODY_VIRTUAL_MAP no frontend
```

### 3.2 Mermaid v10
```diff
- NUNCA use inline :::class com conexões -->
- SEMPRE 4 blocos separados: classDef → nodes → connections → class
- Exemplo correto:
    classDef azul fill:#3b82f6,color:#fff
    A[Bloco] --> B[Bloco]
    class A azul
```

### 3.3 Arquitetura Modular
```diff
- Cada funcionalidade = 1 módulo IIFE independente
- Comunicação via window.MGV e CustomEvents
- NUNCA use ES modules (import/export) — o HTML usa <script defer>
- NUNCA use eval() ou innerHTML com input do usuário
```

### 3.4 Design System
```diff
- Paleta: --mgv-gold: #ffc107, --mgv-gold-dark: #785900, --mgv-brown: #5d4e37
- Bordas: Super Round (rounded-full botões, rounded-xl cards)
- Fonte: Inter via Google Fonts (com preconnect)
- Temas: Dark (padrão), Light, Print
```

### 3.5 Acessibilidade
```diff
- TODOS os botões devem ter aria-label
- Modais devem ter role="dialog" e focus trap
- Usar aria-hidden para toggle de visibilidade
- Usar aria-live="polite" para atualizações dinâmicas
- Respeitar prefers-reduced-motion
```

### 3.6 Segurança
```diff
- Usar.textContent para input do usuário (nunca innerHTML)
- innerHTML apenas em conteúdo controlado (módulos)
- Sem eval(), sem scripts inline perigosos
```

---

## 4. Estrutura de Comunicação

### Namespace Global
```javascript
window.MGV = {
  // Dados compartilhados
  currentOS: { id, client, equipment, status, billingStatus },
  osList: [...],
  
  // Módulos
  crud: osCrud,
  // ... outros módulos
};
```

### CustomEvents
```javascript
// FSM → Dashboard / OS CRUD
document.addEventListener('mgv:fsm-transition', function(e) {
  // e.detail = { from, to, timestamp }
});

// Filtro → Side Panel
document.addEventListener('mgv:filter-change', function(e) {
  // e.detail = { filter: 'todos'|'fabiola'|'reabertura'|'financeiro' }
});

// OS CRUD → FSM / Dashboard
document.addEventListener('mgv:os-updated', function(e) {
  // e.detail = { activeOS, list }
});
```

### Fluxo de Dados (v1.1.0)
```
osCrud ──→ fsmSimulator (sincroniza status da OS ativa)
osCrud ──→ telemetryDashboard (atualiza KPIs)
fsmSimulator ──→ osCrud (retorna novo status após transição)
sectorFilter ──→ docViva (atualiza side panel)
docViva ──→ panZoom (zoom via teclado)
docViva ──→ themeEngine (toggle tema)
```

---

## 5. Matriz Tridimensional de Estados

| Dimensão | Estados | Descrição |
|----------|---------|-----------|
| Status | Operacional, Em Execução, Concluído | Estado operacional da OS |
| Custódia | Na Oficina, Entregue Temp., Entregue Def. | Quem está com o equipamento |
| Pagamento | Sem Pagamento, Parcial, Quitado | Status financeiro |

**Custódia é virtual** — calculada via `CUSTODY_VIRTUAL_MAP` no JS, não no Prisma.

---

## 6. FSM — Máquina de Estados

### Estados (7)
| Estado | Cor | Ícone | Custódia | Pagamento |
|--------|-----|-------|----------|-----------|
| AGUARDANDO_ORCAMENTO | Azul | 📋 | Na Oficina | Sem Pagamento |
| AGUARDANDO_APROVACAO | Roxo | ⏳ | Na Oficina | Sem Pagamento |
| EM_EXECUCAO | Amarelo | 🔧 | Na Oficina | Sem Pagamento |
| AGUARDANDO_PECA | Laranja | 📦 | Na Oficina | Sem Pagamento |
| PRONTO | Verde claro | ✅ | Na Oficina | Sem Pagamento |
| FINALIZADO | Verde | 🎉 | Entregue Def. | Quitado |
| REABERTO | Vermelho | 🔄 | Na Oficina | Sem Pagamento |

### Transições (9)
| De | Para | Ação | Guard |
|----|------|------|-------|
| AGUARDANDO_ORCAMENTO | AGUARDANDO_APROVACAO | Enviar Orçamento | — |
| AGUARDANDO_ORCAMENTO | FINALIZADO | Cancelar OS | Exige justificativa |
| AGUARDANDO_APROVACAO | EM_EXECUCAO | Aprovar | — |
| AGUARDANDO_APROVACAO | FINALIZADO | Reprovar | Exige justificativa |
| EM_EXECUCAO | AGUARDANDO_PECA | Solicitar Peça | — |
| EM_EXECUCAO | PRONTO | Concluir | — |
| AGUARDANDO_PECA | EM_EXECUCAO | Peça Recebida | — |
| PRONTO | FINALIZADO | Finalizar | — |
| FINALIZADO | REABERTO | Reabrir | Exige justificativa |
| REABERTO | EM_EXECUCAO | Retomar | — |

---

## 7. Próximos Passos (Sugeridos)

### Prioridade Alta
| Item | Descrição |
|------|-----------|
| Sincronização API Prisma | Substituir `localStorage` por endpoints REST |
| Export PDF | Geração de relatório individual de OS |

### Prioridade Média
| Item | Descrição |
|------|-----------|
| Testes E2E | Playwright para validação automática |
| Autenticação | Login de usuários (técnicos, gestores) |

### Prioridade Baixa
| Item | Descrição |
|------|-----------|
| PWA | Service worker para uso offline |
| Notificações | Push notifications para mudanças de estado |
| Multi-idioma | i18n (PT-BR, EN, ES) |

---

## 8. Como Assumir o Planejamento

### Passo 1 — Entender o Contexto
1. Ler este documento (`SYSTEM_INSTRUCTIONS.md`)
2. Ler `01_PRD_REQUIREMENTS.md` (requisitos)
3. Ler `02_ARCHITECTURE_DESIGN.md` (arquitetura)
4. Ler `README.md` (visão geral)

### Passo 2 — Entender o Código
1. Ler `visualizador_fluxo.html` (entry point)
2. Ler cada módulo em `modules/`
3. Entender a comunicação via `window.MGV` e CustomEvents

### Passo 3 — Planejar Nova Funcionalidade
1. Definir escopo (o que vai ser feito)
2. Verificar se não quebra regras (Prisma, Mermaid, A11y)
3. Definir módulos afetados
4. Criar PRD específico (se necessário)
5. Criar plano de implementação

### Passo 4 — Executar
1. Criar/modificar módulos conforme plano
2. Testar em todos os temas (Dark/Light/Print)
3. Testar atalhos de teclado
4. Testar acessibilidade (ARIA, focus trap)
5. Atualizar documentação

---

## 9. Comandos Úteis

```bash
# Listar arquivos do projeto
Get-ChildItem "D:\HD\MGV\MGV_2026\MGV-Assistência-Técnica\docs\fluxo de trabalho" -Recurse

# Verificar tamanho dos arquivos
Get-ChildItem "D:\HD\MGV\MGV_2026\MGV-Assistência-Técnica\docs\fluxo de trabalho\modules" | Select-Object Name, Length

# Buscar por padrões no código
Select-String -Path "D:\HD\MGV\MGV_2026\MGV-Assistência-Técnica\docs\fluxo de trabalho\modules\*.js" -Pattern "window.MGV"
```

---

## 10. Contato

**Projeto:** MGV Assistência Técnica em Equipamentos Estéticos  
**Localização:** `D:\HD\MGV\MGV_2026\MGV-Assistência-Técnica\docs\fluxo de trabalho\`  
**Versão:** 1.1.0  
**Última atualização:** 31/07/2026

---

*Este documento é o ponto de entrada para qualquer agente que vá assumir o planejamento de desenvolvimento do projeto.*
