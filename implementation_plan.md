# Melhorias de Nível Enterprise: Integração de Padrões ERP (Base Protheus / SIGASEC)

Este documento detalha o plano estratégico de evolução do **Sistema MGV Assistência Técnica**, fundamentado em conceitos consolidados de gestão de ERPs de grande porte (como a rastreabilidade e governança de serviços do TOTVS Protheus). O objetivo é elevar a operação para um patamar de maturidade técnica, financeira e de relacionamento.

## Decisões Arquiteturais Definidas (Alinhadas com a Diretoria)

✅ **1. Gestão de Custos:** O Preço de Custo (Custo Médio) da peça será, no futuro, importado retroativamente via XML de Nota Fiscal de Entrada. 
*Impacto no Banco de Dados:* Devemos preparar o esquema para suportar relacionamentos com `NotaFiscalEntradaID` (mesmo que nulo no início), garantindo que a estrutura aceite essa evolução.

✅ **2. Censo da Base Instalada (Migração do Legado):** 
Adotaremos a estratégia de **"Onboarding Progressivo" (Lazy Loading)**. 
*Como vai funcionar:* Os equipamentos das OSs abertas (legadas) continuarão funcionando normalmente. No entanto, no momento em que o técnico ou atendente tentar mover a OS legada para a coluna "Finalizado" (ou adicionar uma peça com número de série nela), o sistema fará um bloqueio de tela solicitando: *"Por favor, vincule ou crie a ficha de Base Instalada deste equipamento (exigência de Número de Série)"*. Isso dilui o trabalho de recadastramento no dia a dia, sem travar a operação.

*Roteiro do Plano de Migração Definitiva (SHOficina ➡️ Novo Sistema):*
1. **Extração e Formatos de Entrada:** Os arquivos exportados do SHOficina estão localizados na pasta `temp_migration/` na raiz do projeto. Como vieram originalmente em formato `.xls` (`TABELA_CLIENTES.xls`, `TABELA_EQUIPAMENTOS.xls`, `TABELA_ORDENS_DE_SERVIÇO.xls` e `estoque 01_07-(novo).xls`), utilizaremos ferramentas/scripts internos para processá-los ou convertê-los para os correspondentes CSVs sanitizados esperados pelo pipeline de migração (`clientes.csv`, `equipamentos.csv`, `estoque.csv`, `ordens de seviços.csv`).
2. **Validação (Dry Run):** Antes de persistir qualquer dado no banco real, executaremos o validador no modo a seco: `npx tsx scripts/import_legacy.ts --dry-run` para mapear ausência de colunas, verificar integridade de relacionamentos e avisos de qualidade.
3. **Carga Definitiva:** Com a validação concluída sem erros críticos, executaremos `npx tsx scripts/import_legacy.ts`. O pipeline fará o vínculo de Clientes, Equipamentos (Base Instalada), Estoque de Peças e Histórico de OSs mapeando a estrutura legada à nova organização relacional e ao Kanban do novo sistema.
4. **Verificação:** Validação pós-migração verificando quantidade de linhas importadas e testando integridade das visões 360º de clientes.

---

## Proposed Changes (Requisitos Arquiteturais)

Os módulos abaixo foram reestruturados para englobar a lógica sistêmica e os controles de governança exigidos por operações de alta complexidade.

### 1. Gestão de Base Instalada e Rastreabilidade de Equipamentos
A lógica convencional cria um "aparelho" solto na OS. Em nível Enterprise, o equipamento é um ativo (Base Instalada) vinculado estruturalmente ao cliente.
- **Banco de Dados (Tabelas de Clientes e Dispositivos):**
  - Transformar a tabela de dispositivos em uma **Base Instalada** permanente. Um equipamento (ex: Compressor X) terá um ID único, `data_aquisicao`, `fabricante`, `modelo` e `numero_serie_chassi`.
  - Histórico vitalício: O dispositivo não será mais digitado a cada OS. O cliente "seleciona" o equipamento de sua base instalada para abrir a OS.
- **Frontend (Gestão de Clientes na Sidebar):**
  - A sessão "Clientes" no menu lateral renderizará uma **Tabela de Dados (Data Table) interativa** contendo filtros dinâmicos e de fácil visualização (Busca por Nome, CPF/CNPJ, Status ou Equipamentos vinculados), inspirada nas *grids* de ERPs como Protheus, garantindo localização instantânea.
  - **Visão 360º:** Ao clicar em uma linha da tabela, um painel exibirá todo o parque instalado sob a posse daquele cliente (Base Instalada) e o histórico comercial.
  - **Motor de Recorrência:** Se um equipamento (ID X) abrir mais de 2 OSs num período de 90 dias, o sistema emite um alerta vermelho ("Possível Falha Crônica ou Garantia Acionada") diretamente no Kanban e na tela de 360º.

### 2. Módulo Integrado de Estoque (Governança e Serialização)
Para suportar rastreabilidade ponta-a-ponta, o controle de estoque será embutido diretamente na interface principal. Não será uma página isolada, mas sim uma sessão dinâmica acessada pelo Menu Lateral (Sidebar).
- **Frontend (Tabela e Filtros):** 
  - Ao clicar em "Estoque" no menu lateral, a área central (workspace) carregará uma tabela interativa de dados (Data Table).
  - A tabela contará com filtros rápidos (ex: "Exibir peças abaixo do estoque mínimo", "Busca por SKU" ou "Busca por Nome") para facilitar a localização de produtos sem sair do ambiente do painel.
- **Banco de Dados (Tabelas de Produtos e Lotes):**
  - Expansão do modelo para `sku`, `codigo_barras`, `estoque_minimo`, `preco_custo` e `nota_fiscal_entrada_id` (preparando para a fase 2).
  - **Rastreabilidade Obrigatória:** Peças de alto valor terão uma flag `exige_serie`. 
- **Regras de Negócio na OS:**
  - Ao alocar uma peça "cara" (com a flag `exige_serie` = true) na Ordem de Serviço, o sistema **bloqueia** o avanço do Kanban até que o técnico digite/bip o Número de Série exato daquela peça sendo instalada. Isso impede trocas indevidas de placas em período de garantia.

### 3. Rentabilidade e Apuração de Lucro por OS
Uma OS não é apenas um conserto, é um centro de custo temporário. É vital saber se a operação daquela OS "deu dinheiro".
- **Lógica de Custo (Backend/DB):**
  - Toda vez que uma peça é inserida na OS, o sistema grava um *snapshot* do `preco_custo` daquele exato momento (protegendo a OS contra inflação futura).
  - Adição do campo `custo_hora_tecnico` e registro de tempo na OS.
- **Frontend (Encerramento da OS):**
  - Ao mover o card para "Finalizado", o sistema exibe um modal gerencial (apenas para perfil `OWNER`): 
    - Faturamento Bruto (Peças + Mão de Obra)
    - (-) Custos Operacionais (Custo das Peças + Custo da Hora/Técnico)
    - **(=) Margem de Lucro Real da OS (R$ e %)**

### 4. Portal de Acompanhamento do Cliente (Tracking Público)
Transparência operacional sem onerar o suporte humano.
- O cliente consulta a OS publicamente. A grande diferença do padrão Enterprise é que o Portal exibe **apenas o laudo macro** e o status comercial, omitindo apontamentos técnicos internos (notas de bancada).

### 5. Checklists de Entrada Padronizados
Mitigação de risco civil. 
- Mapeamento das condições iniciais do equipamento (Base Instalada) antes de entrar na bancada, com anexo de fotos via mobile, gerando um Termo de Aceite irrevogável por parte do cliente.

---

## Tabela de Priorização e Matriz de Implementação

Abaixo, a priorização consolidada no formato Matriz de Complexidade vs. Impacto, onde (1) é a execução mais urgente/estratégica e (5) a de menor criticidade imediata.

| Prioridade | Módulo / Melhoria | Impacto no Negócio (ROI/Governança) | Complexidade Técnica | Justificativa Arquitetural |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Módulo Dedicado de Estoque & Serialização** | **Altíssimo** (Evita perdas de garantias e desvios de peças caras). | Média-Alta | Sem um estoque serializado, é impossível rastrear garantias de forma segura e confiável na OS. É o alicerce. |
| **2** | **Rentabilidade por OS (Custo vs Lucro)** | **Alto** (Visão gerencial imediata do fluxo de caixa e margem de lucro por serviço). | Baixa-Média | Alteração rápida no banco de dados, mas traz visibilidade financeira fundamental para os gestores. |
| **3** | **Base Instalada e Alertas de Recorrência (360º)** | **Médio-Alto** (Fidelização de clientes, vendas proativas de manutenção). | Alta | Requer reescrever a vinculação atual entre OS, Aparelho e Cliente. Impacta o core do sistema. |
| **4** | **Checklist de Entrada e Laudo Fotográfico** | **Médio** (Proteção contra passivo, redução de conflitos com clientes). | Média | Envolve gerenciamento de arquivos pesados (blob/s3) e integração mobile. |
| **5** | **Portal de Acompanhamento (Tracking Externo)** | **Médio-Baixo** (Reduz chamadas telefônicas na recepção). | Baixa | Rota simples no express. Bom 'quick win' para agregar valor comercial. |
