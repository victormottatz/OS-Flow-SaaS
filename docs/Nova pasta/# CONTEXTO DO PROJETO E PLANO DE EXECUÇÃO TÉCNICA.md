\# CONTEXTO DO PROJETO E PLANO DE EXECUÇÃO TÉCNICA  
\> \*\*Documento de Contextualização Global e Instruções para Agente de Execução\*\*    
\> \*\*Projeto:\*\* MGV Assistência Técnica — Módulo de OS Complexa, Custódia Dividida, Reversão e Telemetria    
\> \*\*Arquivo Base:\*\* \`docs/fluxo de trabalho/visualizador\_fluxo.html\`

\---

\#\# 📑 Sumário de Navegação  
1\. \[Visão Geral e Diagnóstico do Negócio\](\#1-visão-geral-e-diagnóstico-do-negócio)  
2\. \[O Caso Real Indutor: OS 234813 (Cliente Fabíola)\](\#2-o-caso-real-indutor-os-234813-cliente-fabíola)  
3\. \[Pilares Arquiteturais e Mitigação de Riscos\](\#3-pilares-arquiteturais-e-mitigação-de-riscos)  
4\. \[A Matriz de Estados Tridimensional\](\#4-a-matriz-de-estados-tridimensional)  
5\. \[Especificação do Banco de Dados (Prisma Schema)\](\#5-especificação-do-banco-de-dados-prisma-schema)  
6\. \[Estado Atual do Código (Artefato Existente)\](\#6-estado-atual-do-código-artefato-existente)  
7\. \[Plano de Ação Mestre: 4 Fases e Detalhamento de Tasks\](\#7-plano-de-ação-mestre-4-fases-e-detalhamento-de-tasks)  
8\. \[Instruções Diretas para o Próximo Agente de Execução\](\#8-instruções-diretas-para-o-próximo-agente-de-execução)

\---

\#\# 1\. Visão Geral e Diagnóstico do Negócio

A maioria dos sistemas comerciais de Ordem de Serviço (OS) assume uma \*\*visão linear e rígida\*\* do trabalho:  
$$\\text{Entrada} \\longrightarrow \\text{Em Manutenção} \\longrightarrow \\text{Pronto} \\longrightarrow \\text{Finalizado}$$

No mundo real de uma assistência técnica de equipamentos médicos, estéticos e de precisão, a operação é \*\*não linear\*\*. Equipamentos saem da oficina temporariamente enquanto aguardam peças de importação, pagamentos são efetuados em etapas (sinais, diagnósticos parciais), atendentes cometem erros ao clicar em "Finalizar", e dados do cliente precisam ser corrigidos sem travar o processo.

Este projeto estabelece a nova arquitetura para o sistema \*\*MGV Assistência Técnica\*\*, garantindo flexibilidade operacional total com \*\*zero furo de caixa\*\*, \*\*rastreabilidade via AuditLog\*\* e \*\*separação de custódia física do estado financeiro\*\*.

\---

\#\# 2\. O Caso Real Indutor: OS 234813 (Cliente Fabíola)

\#\#\# O Cenário Operacional:  
1\. Um equipamento caro deu entrada para manutenção.  
2\. O diagnóstico exigiu uma peça externa com prazo de entrega de 30 dias.  
3\. A cliente Fabíola optou por \*\*levar o equipamento de volta para casa\*\* temporariamente enquanto a peça está em trânsito.  
4\. A cliente realizou um \*\*pagamento parcial\*\* (taxa de diagnóstico/serviço já executado).

\#\#\# O Erro nos Sistemas Antigos vs. Solução do Novo Sistema:  
\* \*\*Sistema Antigo (SHoficina):\*\* Marcou como \`EQUIPAMENTO ENTREGUE \- FALTA PGTO\` (misturando localização com dívida).  
\* \*\*Sistema Novo (Erro anterior):\*\* Classificou erroneamente como \`FINALIZADO\` com valor \`R$ 0,00\` (perda de histórico e furo de caixa).  
\* \*\*Nova Arquitetura (Aprovada):\*\*  
  \* \*\*Status Operacional:\*\* \`AGUARDANDO\_PECA\` (A OS permanece aberta na fila técnica).  
  \* \*\*Status de Custódia:\*\* \`ENTREGUE\_TEMPORARIAMENTE\` (O item está fisicamente com a cliente).  
  \* \*\*Status Financeiro:\*\* \`PAGO\_PARCIAL\` (O pagamento da taxa de diagnóstico foi registrado na tabela de lançamentos reais \`Payments\`).

\---

\#\# 3\. Pilares Arquiteturais e Mitigação de Riscos

Para evitar falhas operacionais e inconsistências bancárias/fiscais, o sistema adota 5 proteções de arquitetura:

\`\`\`  
┌────────────────────────────────────────────────────────────────────────────────────────┐  
│ 1\. Separação Financeira : Valor Estimado na OS vs. Entradas Reais na Tabela Payments    │  
│ 2\. AuditLog Obrigatório : Histórico imutável de quem, quando e por que reabriu/editou │  
│ 3\. Edição em Seções     : Micro-updates (PATCH) para evitar sobrescrita por concorrência│  
│ 4\. Trava Fiscal Inteligente: Alertas caso a OS possua NF-e emitida na SEFAZ/Bling        │  
│ 5\. Matriz Tridimensional: Independência entre Status Técnico, Custódia e Financeiro  │  
└────────────────────────────────────────────────────────────────────────────────────────┘  
\`\`\`

\---

\#\# 4\. A Matriz de Estados Tridimensional

O estado de uma Ordem de Serviço deixa de ser um único campo e passa a ser representado pelo produto cartesiano de 3 dimensões independentes:

$$\\text{Estado da OS} \= \\text{Status Operacional} \\times \\text{Status de Custódia} \\times \\text{Status Financeiro}$$

\`\`\`  
                   ┌─────────────────────────────────────────────────┐  
                   │               MATRIZ DE ESTADOS                 │  
                   └────────────────────────┬────────────────────────┘  
                                            │  
         ┌──────────────────────────────────┼──────────────────────────────────┐  
         ▼                                  ▼                                  ▼  
┌─────────────────┐                ┌─────────────────┐                ┌─────────────────┐  
│ OPERACIONAL     │                │ CUSTÓDIA        │                │ FINANCEIRO      │  
├─────────────────┤                ├─────────────────┤                ├─────────────────┤  
│ ORCAMENTO       │                │ NA\_OFICINA      │                │ PENDENTE        │  
│ EM\_MANUTENCAO   │                │ ENTREGUE\_TEMP   │                │ PAGO\_PARCIAL    │  
│ AGUARDANDO\_PECA │                │ ENTREGUE\_DEFINI │                │ PAGO            │  
│ PRONTO\_RETIRADA │                └─────────────────┘                │ CREDIARIO       │  
│ FINALIZADO      │                                                   │ INADIMPLENTE    │  
│ REABERTO        │                                                   └─────────────────┘  
└─────────────────┘  
\`\`\`

\---

\#\# 5\. Especificação do Banco de Dados (Prisma Schema)

O modelo estendido no \`prisma/schema.prisma\` deve suportar os novos enums e campos de auditoria:

\`\`\`prisma  
enum OSStatus {  
  ORCAMENTO  
  AGUARDANDO\_AVALIACAO  
  AGUARDANDO\_AUTORIZACAO  
  AGUARDANDO\_PECA  
  EM\_MANUTENCAO  
  PRONTO\_RETIRADA  
  ENTREGUE\_AGUARDANDO\_PECA // Retirada temporária pelo cliente  
  FINALIZADO  
  REABERTO                 // OS revertida para revisão  
}

enum OSCustodyStatus {  
  NA\_OFICINA  
  ENTREGUE\_TEMPORARIAMENTE  
  ENTREGUE\_DEFINITIVO  
}

enum OSFinancialStatus {  
  PENDENTE  
  PAGO\_PARCIAL  
  CREDIARIO  
  PAGO  
  INADIMPLENTE  
}

model OrdemServico {  
  id               String            @id @default(uuid())  
  code             Int               @unique @default(autoincrement())  
  status           OSStatus          @default(ORCAMENTO)  
  custodyStatus    OSCustodyStatus   @default(NA\_OFICINA)  
  financialStatus  OSFinancialStatus @default(PENDENTE)  
    
  // Controle de Reabertura e Auditoria  
  isReopened       Boolean           @default(false)  
  reopenedReason   String?           @db.Text  
  reopenedAt       DateTime?  
  reopenedBy       String?  
    
  // Controle Financeiro Parcial  
  estimatedTotal   Decimal           @db.Decimal(10, 2\)  
  advancePayment   Decimal           @default(0.00) @db.Decimal(10, 2\)  
    
  // Relacionamentos  
  payments         Payment\[\]  
  auditLogs        AuditLog\[\]  
    
  createdAt        DateTime          @default(now())  
  updatedAt        DateTime          @updatedAt  
}  
\`\`\`

\---

\#\# 6\. Estado Atual do Código (Artefato Existente)

A aplicação atual é uma \*\*Single File Application (SFA)\*\* construída em \`docs/fluxo de trabalho/visualizador\_fluxo.html\`.

\#\#\# Características da Implementação Atual:  
\* \*\*Engine Visual:\*\* Mermaid.js v10.9.6 rodando em modo dark.  
\* \*\*Interface:\*\* HTML5 \+ CSS Variables (\`--bg-main\`, \`--bg-card\`, \`--accent-gold\`, etc.) \+ Vanilla JavaScript.  
\* \*\*Destaques e Interatividade:\*\* Painel lateral com explicação do Caso Fabíola, Reabertura, Gestão Parcial e Edição Livre.  
\* \*\*Compatibilidade:\*\* Código Mermaid totalmente corrigido e livre de erros sintáticos (declaração de nós separada da atribuição de classes \`class NO1,NO2 estilo;\`).

\---

\#\# 7\. Plano de Ação Mestre: 4 Fases e Detalhamento de Tasks

O plano de evolução do protótipo atual para a plataforma de simulação e dashboard de produção está dividido em 4 fases:

\---

\#\#\# 🎨 FASE 1: Base de Interface, Acessibilidade e Navegação (UX & Canvas)

\#\#\#\# Task 1.1 — Engine de Temas CSS Dinâmicos (Dark / Light / High-Contrast Print)  
\* \*\*Objetivo:\*\* Adicionar suporte a tema claro para balcão diurno e tema de alta legibilidade para impressão em papel/PDF.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (\`\<style\>\` e \`\<header\>\`).  
\* \*\*DoD:\*\* Chaveamento sem reload via botão no header \+ \`@media print\` otimizado para economia de tinta.

\#\#\#\# Task 1.2 — Manipulação de Canvas: Pan & Zoom Interativo (Mouse Wheel & Drag)  
\* \*\*Objetivo:\*\* Permitir arrastar (pan) e dar zoom (scroll) no diagrama dinamicamente.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (\`\<script\>\` e container \`.diagram-viewport\`).  
\* \*\*DoD:\*\* Arrasto fluído com o mouse \+ botões de zoom sincronizados sem desalinhar elementos.

\#\#\#\# Task 1.3 — Filtro de Visibilidade por Setor/Departamento (Swimlanes Virtuais)  
\* \*\*Objetivo:\*\* Destacar apenas os nós de um determinado setor (\`Recepção\`, \`Oficina\`, \`Financeiro\`, \`Cliente\`) apagando o restante com opacidade reduzida.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (\`sidebar\` e funções JS de filtro).  
\* \*\*DoD:\*\* Clique no setor foca os nós correspondentes e reduz a opacidade (\`0.2\`) dos demais.

\---

\#\#\# 🛠️ FASE 2: Engenharia do Conhecimento & Documentação Viva (DevTools)

\#\#\#\# Task 2.1 — Sistema de Modais de Detalhe Técnico ao Clicar nos Nós  
\* \*\*Objetivo:\*\* Clicar num nó do diagrama abre um modal exibindo regras de negócio, arquivos backend envolvidos e rotas REST.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (Mapeamento JS \+ HTML Modal).  
\* \*\*DoD:\*\* Evento \`click\` do Mermaid exibe modal responsivo com documentação detalhada.

\#\#\#\# Task 2.2 — Playground do Prisma Schema Dinâmico  
\* \*\*Objetivo:\*\* Exibir em um painel lateral a mutação dos campos do registro Prisma conforme o cenário selecionado.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (Painel lateral / componente de código).  
\* \*\*DoD:\*\* O código Prisma exibido reflete os valores exatos dos enums para o cenário ativo.

\#\#\#\# Task 2.3 — Módulo de Exportação Multi-Formato (PNG, SVG, PDF e JSON)  
\* \*\*Objetivo:\*\* Exportar o gráfico renderizado em imagem de alta definição, vetor SVG ou configuração JSON.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (Funções de conversão Blob/Canvas).  
\* \*\*DoD:\*\* Downloads executados com sucesso em PNG e SVG sem truncar textos.

\---

\#\#\# ⚙️ FASE 3: Simulador de Regras de Negócio & Playground Interativo (FSM)

\#\#\#\# Task 3.1 — Engine do Simulador Sequencial Passo a Passo (FSM Simulator)  
\* \*\*Objetivo:\*\* Criar um controle de reprodução (\`Próximo Passo\` / \`Anterior\`) que move uma "OS Virtual" pelo gráfico.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (Classe JS \`OSStateSimulator\`).  
\* \*\*DoD:\*\* Borda pulsante destaca o nó ativo enquanto os cards laterais exibem a evolução do estado.

\#\#\#\# Task 3.2 — Widget de Calculadora Live de Saldo e Transação Financeira  
\* \*\*Objetivo:\*\* Permite digitar valor orçado e entradas parciais, calculando o saldo e ajustando os status na hora.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (Widget de cálculo na barra lateral).  
\* \*\*DoD:\*\* O recálculo instantâneo atualiza a Matriz de 3 Dimensões dinamicamente.

\#\#\#\# Task 3.3 — Drawer Expansível com Editor Live de Código Mermaid (Playground Studio)  
\* \*\*Objetivo:\*\* Painel retrátil no rodapé para editar o código Mermaid puro e ver o gráfico recarregar em tempo real.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (Textarea de código \+ renderizador dinâmico).  
\* \*\*DoD:\*\* Edição de texto recarrega o gráfico com tratamento de erros de sintaxe sem travar a tela.

\---

\#\#\# 📊 FASE 4: Telemetria Real-Time, Alertas de SLA e Modo Dashboard (Produção)

\#\#\#\# Task 4.1 — Contrato da API REST / WebSocket de Telemetria (\`/api/metrics/os-flow\`)  
\* \*\*Objetivo:\*\* Definir o conector JSON para receber a quantidade de OSs ativas paradas em cada nó da oficina.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (Módulo de Fetch / Polling).  
\* \*\*DoD:\*\* Função JS pronta para consumir dados reais via WebSocket ou HTTP Polling.

\#\#\#\# Task 4.2 — Injeção de Badges de Quantidade Real em Tempo Real nos Nós do SVG  
\* \*\*Objetivo:\*\* Injetar bolhas contadoras sobre cada nó do SVG indicando o volume de trabalho acumulado.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (Manipulador DOM SVG).  
\* \*\*DoD:\*\* Nós exibem badges numéricas (\`\[ 5 \]\`) atualizadas dinamicamente.

\#\#\#\# Task 4.3 — Alertas Visuais de Violabilidade de SLA e Trava de Gargalo  
\* \*\*Objetivo:\*\* Fazer piscar em vermelho os nós onde existem OSs atrasadas além do limite tolerado pelo SLA.  
\* \*\*Arquivos Afetados:\*\* \`visualizador\_fluxo.html\` (Motor de validação de SLA).  
\* \*\*DoD:\*\* Nós com estouro de prazo acionam animação de alerta e resumos no painel lateral.

\---

\#\# 8\. Instruções Diretas para o Próximo Agente de Execução

Se você é o agente encarregado de aplicar as alterações, siga estritamente o protocolo abaixo:

1\. \*\*Localização do Arquivo:\*\* Edite diretamente o arquivo existente em \`docs/fluxo de trabalho/visualizador\_fluxo.html\`.  
2\. \*\*Ordem de Execução:\*\* Execute \*\*uma Task por vez\*\*, respeitando a ordem sequencial das fases (Inicie pela \*\*Task 1.1 da Fase 1\*\*).  
3\. \*\*Regra de Ouro do Mermaid v10:\*\* NUNCA misture aplicação de classes inline (\`:::classe\`) com definições de conexões (\`--\>\` ou \`-.-\`). Mantenha a estrutura em 4 blocos separados:  
   \* \*\*Bloco 1:\*\* \`classDef\`  
   \* \*\*Bloco 2:\*\* Declaração dos Nós com seus textos \`NODE\_ID\["Texto"\]\`  
   \* \*\*Bloco 3:\*\* Declaração das Conexões \`NO1 \--\> NO2\`  
   \* \*\*Bloco 4:\*\* Atribuição de Classes \`class NO1,NO2 nomeDaClasse;\`  
4\. \*\*Validação:\*\* Após concluir cada Task, valide se o arquivo continua abrindo diretamente no navegador (protocolo \`file:///\` ou servidor local) sem erros no Console do Desenvolvedor (\`F12\`).

\---  
\*Documento pronto para absorção e execução imediata.\*  
