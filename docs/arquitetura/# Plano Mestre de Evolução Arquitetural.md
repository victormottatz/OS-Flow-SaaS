\# Plano Mestre de Evolução Arquitetural  
\#\# Aplicação Single-File: Visualizador Interativo & Dashboard de Fluxo de OS

\---

\#\# 📌 Visão Geral e Estratégia de Execução

Este plano tem como objetivo transformar o protótipo funcional \`visualizador\_fluxo.html\` em uma \*\*Plataforma Completa de Documentação Viva, Simulação de Negócio e Dashboard de Operação em Tempo Real\*\*.

A execução é dividida em \*\*4 Fases Sequenciais\*\*, organizadas por dependência técnica e valor agregado ao negócio:

\`\`\`  
┌──────────────────────────────────────────────────────────────────────────────────┐  
│ FASE 1: Base de Interface, Acessibilidade e Navegação (UX & Canvas)              │  
├──────────────────────────────────────────────────────────────────────────────────┤  
│ FASE 2: Engenharia do Conhecimento & Documentação Viva (DevTools)               │  
├──────────────────────────────────────────────────────────────────────────────────┤  
│ FASE 3: Simulador de Regras de Negócio & Playground Interativo (FSM)            │  
├──────────────────────────────────────────────────────────────────────────────────┤  
│ FASE 4: Telemetria Real-Time, Alertas de SLA e Modo Dashboard (Produção)         │  
└──────────────────────────────────────────────────────────────────────────────────┘  
\`\`\`

\---

\#\# 🚀 FASE 1: Base de Interface, Acessibilidade e Navegação (UX & Canvas)  
\*\*Objetivo\*\*: Garantir usabilidade impecável, suporte a impressão corporativa, navegação fluida em mapas grandes e filtragem por papel de usuário (Recepção, Oficina, Financeiro).

\---

\#\#\# Task 1.1 — Implementar Engine de Temas CSS Dinâmicos (Dark / Light / High-Contrast Print)  
\* \*\*Descrição Técnica\*\*: Expandir o dicionário de variáveis CSS no \`:root\` para suportar chaveamento dinâmico via atributo \`data-theme="light|dark|print"\` no elemento \`\<html\>\`.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Criar seletor CSS \`\[data-theme="light"\]\` com paleta para uso diurno no balcão da recepção (\`\#ffffff\`, \`\#f1f5f9\`, \`\#0f172a\`).  
  2\. Criar seletor CSS \`\[data-theme="print"\]\` otimizado para economia de tinta de impressora (fundo branco, texto preto puro, linhas finas).  
  3\. Adicionar botão na \`header\` para alternar entre os temas e salvar a preferência no \`localStorage\`.  
  4\. Inserir \`@media print\` CSS para forçar automaticamente o tema de impressão sem desconfigurar a tela.  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Alternância instantânea de temas sem recarregar a página.  
  \- Impressão (Ctrl+P) gera relatório limpo em fundo branco sem cortar bordas do diagrama.

\---

\#\#\# Task 1.2 — Integrar Manipulação de Canvas: Pan & Zoom Interativo (Mouse Wheel & Drag)  
\* \*\*Descrição Técnica\*\*: Adicionar biblioteca lightweight (ex: \`svg-pan-zoom.js\` via CDN ou implementação nativa de matriz de transformação CSS) sobre a viewport \`.diagram-viewport\`.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Envolver o SVG gerado pelo Mermaid dentro de um container com suporte a eventos de ponteiro (\`mousedown\`, \`mousemove\`, \`mouseup\`, \`wheel\`).  
  2\. Implementar transformações de matriz CSS (\`transform: translate(x, y) scale(z)\`).  
  3\. Atualizar os botões existentes (\`🔍 \+\`, \`🔍 \-\`, \`🔄 Reset\`) para sincronizar com as coordenadas do mouse.  
  4\. Adicionar indicador discreto do nível de Zoom atual (ex: \`120%\`).  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Permite arrastrar o diagrama mantendo o clique pressionado (Pan).  
  \- Zoom com a roda do mouse focado no ponteiro sem desalinhar o layout.

\---

\#\#\# Task 1.3 — Implementar Filtro de Visibilidade por Setor/Departamento (Swimlanes Virtuais)  
\* \*\*Descrição Técnica\*\*: Mapear cada nó do diagrama a um setor operacional (\`RECEPCAO\`, \`OFICINA\`, \`FINANCEIRO\`, \`CLIENTE\`) e aplicar opacidade/blur nos nós fora do foco selecionado.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Criar dicionário JS de setores:  
     \`\`\`javascript  
     const SECTOR\_MAPPING \= {  
       RECEPCAO: \['ENTRADA', 'AVALIACAO', 'RETIRADA\_TEMP', 'FINALIZADO'\],  
       OFICINA: \['AVALIACAO', 'EXECUCAO', 'CONCLUIDO', 'RETORNO'\],  
       FINANCEIRO: \['PGTO\_PARCIAL', 'PGTO\_TOTAL'\],  
       CLIENTE: \['AGUARDA\_CASA', 'RETIRADA\_TEMP'\]  
     };  
     \`\`\`  
  2\. Adicionar barra de botões com filtro de setor na interface.  
  3\. Ao clicar num setor, varrer os elementos \`.node\` do SVG e aplicar \`style.opacity \= '0.15'\` e \`filter \= 'grayscale(1)'\` nos nós ausentes no mapeamento.  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Atendente de recepção clica em "Recepção" e enxerga com destaque apenas os nós que dizem respeito ao balcão.

\---

\#\# 🛠️ FASE 2: Engenharia do Conhecimento & Documentação Viva (DevTools)  
\*\*Objetivo\*\*: Transformar o diagrama em uma ferramenta de onboarding e documentação ativa para desenvolvedores Fullstack, conectando a visão visual com código do banco de dados e APIs.

\---

\#\#\# Task 2.1 — Sistema de Modais de Detalhe Técnico ao Clicar nos Nós  
\* \*\*Descrição Técnica\*\*: Injetar escutadores de eventos de clique nos nós do SVG usando o callback \`click\` do Mermaid.js, abrindo um modal responsivo com metadados técnicos do nó.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Configurar \`mermaid.initialize({ securityLevel: 'loose' })\` e atribuir função global \`window.onNodeClick(nodeId)\`.  
  2\. Mapear cada nó para uma estrutura de conhecimento estendida:  
     \`\`\`javascript  
     const NODE\_TECHNICAL\_DOCS \= {  
       RETIRADA\_TEMP: {  
         title: "Retirada Temporária pelo Cliente",  
         sector: "Recepção / Custódia",  
         prismaEnum: "OSCustodyStatus.ENTREGUE\_TEMPORARIAMENTE",  
         apiEndpoint: "PATCH /api/orders/:id/custody",  
         validationRules: \["Requer confirmação de entrega parcial", "Exige assinatura digital de retirada"\],  
         backendFile: "src/services/custodyService.ts"  
       }  
     };  
     \`\`\`  
  3\. Criar estrutura HTML/CSS para o modal com animação de entrada (Fade/Slide-up).  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Clicar em qualquer caixa do gráfico abre um modal completo com informações técnicas do backend e regras de negócio.

\---

\#\#\# Task 2.2 — Desenvolver o Playground do Prisma Schema Dinâmico  
\* \*\*Descrição Técnica\*\*: Adicionar uma aba/painel lateral "Prisma Schema" que exibe o modelo do banco de dados mudando em tempo real conforme o nó selecionado.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Criar componente de visualização de código com syntax highlighting simples (CSS para palavras-chave como \`model\`, \`enum\`, \`@id\`).  
  2\. Implementar gerador de código Prisma reativo. Quando o usuário clica num cenário (ex: Caso Fabíola), a caixa exibe o registro exato do banco:  
     \`\`\`prisma  
     // Estado do Registro no Banco de Dados  
     model OrdemServico {  
       id              \= "OS-234813"  
       status          \= AGUARDANDO\_PECA  
       custodyStatus   \= ENTREGUE\_TEMPORARIAMENTE  
       financialStatus \= PAGO\_PARCIAL  
       advancePayment  \= 300.00  
     }  
     \`\`\`  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Devs iniciantes conseguem visualizar exatamente como o registro Prisma se comporta em cada estado da OS.

\---

\#\#\# Task 2.3 — Módulo de Exportação Multi-Formato (PNG, SVG, PDF e JSON)  
\* \*\*Descrição Técnica\*\*: Criar utilitário de conversão para extrair o vetor SVG do DOM e exportá-lo diretamente como arquivo ou converter em imagem bitmap/JSON.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. \*\*Exportar SVG\*\*: Serializar o nó \`\<svg\>\` para String com XMLNS e disparar download Blob.  
  2\. \*\*Exportar PNG\*\*: Desenhar o SVG em um elemento \`\<canvas\>\` HTML5 oculto e converter para \`data:image/png\`.  
  3\. \*\*Exportar JSON\*\*: Exportar a árvore de nós e estados para consumo por outras ferramentas.  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Botão de download gera arquivo \`.png\` de alta qualidade sem truncar textos ou quebrar cores.

\---

\#\# ⚙️ FASE 3: Simulador de Regras de Negócio & Playground Interativo (FSM)  
\*\*Objetivo\*\*: Permitir a simulação ativa das regras financeiras e operacionais antes da implementação no código-fonte do sistema principal.

\---

\#\#\# Task 3.1 — Engine do Simulador Sequencial Passo a Passo (Finite State Machine Simulator)  
\* \*\*Descrição Técnica\*\*: Criar uma Máquina de Estados Finita (FSM) em JS que gerencia uma "OS Virtual" permitindo avançar e retroceder no fluxo.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Implementar classe \`OSStateSimulator\`:  
     \`\`\`javascript  
     class OSStateSimulator {  
       constructor() {  
         this.history \= \[\];  
         this.currentNode \= 'ENTRADA';  
         this.stateData \= { totalValue: 800, paidValue: 0, items: \[\] };  
       }  
       transitionTo(nodeId, payload) { ... }  
       stepBack() { ... }  
     }  
     \`\`\`  
  2\. Inserir barra de reprodução no topo da viewport: \`\[⏮️ Início\] \[◀️ Anterior\] \[▶️ Próximo Passo\] \[⏭️ Fim\]\`.  
  3\. Iluminar com borda pulsante dourada o nó ativo na simulação e apagar os nós inativos.  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Usuário consegue simular a vida inteira de uma OS clicando em "Próximo Passo", vendo o estado mudar etapa por etapa.

\---

\#\#\# Task 3.2 — Widget de Calculadora Live de Saldo e Transação Financeira  
\* \*\*Descrição Técnica\*\*: Incorporar um painel interativo de simulação financeira para validar regras de pagamento parcial, sinal e saldo devedor.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Criar formulário reativo com campos:  
     \- \`Valor Total do Orçamento (R$)\`  
     \- \`Sinal / Taxa de Diagnóstico Paga (R$)\`  
  2\. Calcular em tempo real:  
     $$\\text{Saldo Devedor} \= \\text{Valor Total} \- \\text{Sinal Pago}$$  
  3\. Atualizar dinamicamente a Matriz de Estados:  
     \- Se \`Sinal Pago \== 0\` $\\rightarrow$ \`financialStatus: PENDENTE\`  
     \- Se \`0 \< Sinal Pago \< Valor Total\` $\\rightarrow$ \`financialStatus: PAGO\_PARCIAL\`  
     \- Se \`Sinal Pago \== Valor Total\` $\\rightarrow$ \`financialStatus: PAGO\`  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- A calculadora reage aos valores digitados e altera as tags visuais de status financeiro na hora.

\---

\#\#\# Task 3.3 — Drawer Expansível com Editor Live de Código Mermaid (Playground Studio)  
\* \*\*Descrição Técnica\*\*: Adicionar uma gaveta expansível no rodapé com um \`\<textarea\>\` contento o código Mermaid puro e tratamento de exceções de compilação.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Inserir painel dobrável (Collapse) no rodapé.  
  2\. Escutar evento \`input\` do textarea com \`debounce\` de 500ms.  
  3\. Executar \`mermaid.render()\` dinamicamente para atualizar o gráfico.  
  4\. Exibir badge de erro vermelho com linha e descrição caso o usuário digite código inválido, sem travar a aplicação.  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Permite alterar nomes de nós ou adicionar novas conexões na hora e ver o resultado renderizado imediatamente.

\---

\#\# 📊 FASE 4: Telemetria Real-Time, Alertas de SLA e Modo Dashboard (Produção)  
\*\*Objetivo\*\*: Conectar o visualizador a dados reais de produção via API, transformando a ferramenta de documentação em um \*\*Dashboard Gerencial Kanban/Gargalos\*\*.

\---

\#\#\# Task 4.1 — Projetar Contrato da API REST / WebSocket de Telemetria (\`/api/metrics/os-flow\`)  
\* \*\*Descrição Técnica\*\*: Definir a especificação da API no backend para retornar a quantidade de OSs ativas paradas em cada nó do fluxo.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Especificar o JSON de resposta:  
     \`\`\`json  
     {  
       "timestamp": "2026-03-31T14:30:00Z",  
       "metrics": {  
         "ENTRADA": 3,  
         "AVALIACAO": 8,  
         "EXECUCAO": 12,  
         "RETIRADA\_TEMP": 4,  
         "AGUARDANDO\_PECA": 6,  
         "FINALIZADO": 142  
       },  
       "slaAlerts": {  
         "EXECUCAO": { "delayedCount": 2, "maxDays": 5 }  
       }  
     }  
     \`\`\`  
  2\. Implementar função de \`fetch\` periódico (Polling a cada 30s) ou conexão \`WebSocket\`.  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Aplicação pronta para consumir dados de telemetria sem acoplamento rígido.

\---

\#\#\# Task 4.2 — Injeção de Badges de Quantidade Real em Tempo Real nos Nós do SVG  
\* \*\*Descrição Técnica\*\*: Manipular o DOM do SVG renderizado para injetar badges numéricas (bolhas de contagem) sobre os nós correspondentes.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Criar função \`injectMetricBadges(metricsData)\`:  
     \- Localizar a tag \`\<g class="node"\>\` referente a cada estado.  
     \- Inserir elemento \`\<circle\>\` e \`\<text\>\` com o valor numérico (ex: \`\[ 4 \]\`).  
  2\. Aplicar animação de pulso vermelho nos nós com valor acima do limite (gargalo de garrafa na oficina).  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- Cada nó do diagrama passa a exibir quantas ordens de serviço estão paradas naquela etapa no mundo real.

\---

\#\#\# Task 4.3 — Alertas Visuais de Violabilidade de SLA e Trava de Gargalo Operacional  
\* \*\*Descrição Técnica\*\*: Destacar nós cujo tempo médio de permanência estrapola os limites estipulados pela gerência.  
\* \*\*Detalhamento do Código/Atividades\*\*:  
  1\. Definir limites de tempo por nó (ex: \`AVALIACAO\` máximo 24 horas; \`AGUARDANDO\_PECA\` máximo 10 dias).  
  2\. Se a telemetria reportar OSs estouradas naquele nó, adicionar classe CSS \`.sla-violated\` que faz a caixa piscar em tom vermelho escuro.  
  3\. Exibir no painel lateral um resumo dos alertas operacionais do dia.  
\* \*\*Critério de Aceite (DoD)\*\*:  
  \- O gestor bate o olho no diagrama e identifica na hora onde a operação da assistência técnica está travada.

\---

\#\# 🧩 Matriz de Rastreabilidade e Fragmentação de Arquivos

Para manter a simplicidade de arquivo único ou modularização limpa, a arquitetura final será organizada conforme abaixo:

\`\`\`  
/docs/fluxo de trabalho/  
│  
├── visualizador\_fluxo.html        \# Aplicação Principal (HTML/CSS/JS Unificado)  
│  
├── modules/ (Opcional se for modularizado)  
│   ├── themeEngine.js             \# Gestor de Temas e Impressão (Task 1.1)  
│   ├── panZoomEngine.js           \# Gestor de Matriz de Transformação SVG (Task 1.2)  
│   ├── sectorFilter.js            \# Lógica de Filtragem por Raias (Task 1.3)  
│   ├── nodeDocsData.js            \# Dicionário de Documentação Técnica (Task 2.1)  
│   ├── prismaPlayground.js        \# Gerador Reativo do Schema (Task 2.2)  
│   ├── stateSimulator.js          \# Engine da Máquina de Estados Finita (Task 3.1)  
│   └── telemetryAdapter.js        \# Conector de Dados WebSocket/REST (Task 4.1)  
│  
└── tests/  
    └── flowValidation.test.ts     \# Testes Automatizados de Sintaxe e Regras  
\`\`\`

\---

\#\# 📈 Cronograma de Execução Estimado

\`\`\`  
\[Semana 1\] ──► FASE 1: Interface, Temas, Pan/Zoom e Filtro de Setor (Tasks 1.1 a 1.3)  
\[Semana 2\] ──► FASE 2: Documentação Viva, Modais e Exportação (Tasks 2.1 a 2.3)  
\[Semana 3\] ──► FASE 3: Simulador FSM, Calculadora e Playground Live (Tasks 3.1 a 3.3)  
\[Semana 4\] ──► FASE 4: Telemetria, Badges SVG e Dashboard Real-Time (Tasks 4.1 a 4.3)  
\`\`\`

\---

\#\#\# Próximo Passo  
Com este plano mestre aprovado, por qual \*\*Task da Fase 1\*\* você gostaria de iniciar o desenvolvimento do código?  
