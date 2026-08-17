# Formulários do MGV One Hub & Guarda de Alterações Não Salvas

> Documento de referência: inventário de **todos** os formulários do sistema e o
> status da **guarda de alterações não salvas** (`beforeunload`, padrão Gmail/GitHub).
> A guarda faz o navegador avisar antes de recarregar/fechar a página quando há
> trabalho não salvo.

## Como a guarda funciona

- `src/utils/unsavedChanges.ts` — contador global (`markUnsavedChanges` / `hasUnsavedChanges`) + listener `beforeunload`.
- `src/hooks/useUnsavedChangesGuard.ts` — hook que liga um estado "formulário sujo" à guarda (marca ao ficar sujo, desmarca ao salvar/cancelar/desmontar).
- `src/App.tsx` — instala o listener global uma única vez.

## Formulários protegidos ✅

| # | Componente | Formulário | Campos monitorados |
|---|---|---|---|
| 1 | `OSManager.tsx` | Wizard **Nova OS** (4 passos) | cliente, aparelho, aparelho avulso, defeito relatado, acessórios, estado físico, garantia, checklist, fotos |
| 2 | `ClientManager.tsx` | Modal **Novo Cliente** | nome, CPF/CNPJ, telefones, e-mail, endereço, CEP, equipamentos |
| 3 | `ClientManager.tsx` | Modal **Novo Dispositivo** (individual) | tipo extra, marca, modelo, nº série, descrição |
| 4 | `ClientManager.tsx` | Modal **Editar Dispositivo** | tipo extra, marca, modelo, nº série, descrição |
| 5 | `ClientManager.tsx` | **Nota de Prontuário Técnico** (drawer de histórico) | conteúdo da nota |
| 6 | `KanbanBoard.tsx` | Modal **Editar OS** (abas laudo/peças/entrada/saída) | laudo, laudo macro, desconto, peças, item avulso, checklist entrada/saída, fotos |
| 7 | `KanbanBoard.tsx` | Modal **Onboarding de Dispositivo Legado** | tipo extra, marca, modelo, série, descrição |
| 8 | `DashboardView.tsx` | Formulário rápido **Registrar Peça** | nome, código, estoque, custo, preço |
| 9 | `StockManager.tsx` | Modal **Nova/Editar Peça** | todos os campos do cadastro (inclusive fiscais) |
| 10 | `StockManager.tsx` | Modal **Importar XML** (compra) | XML colado |
| 11 | `FiscalPanel.tsx` | Modal **Editar Cliente Fiscal** | nome, CPF/CNPJ, IE, endereço, cidade, UF, CEP |
| 12 | `OSWhatsAppPanel.tsx` | Compositor de **Mensagem WhatsApp** | texto da mensagem |
| 13 | `BlingSandbox.tsx` | **Importação de XML NFe** | XML colado |
| 14 | `BlingSandbox.tsx` | Modal de **Faturamento Estratégico** | Inscrição Estadual do cliente |
| 15 | `ProfileSettings.tsx` | Formulário **Perfil** | nome, e-mail, telefone, bio, avatar |
| 16 | `ProfileSettings.tsx` | Formulário **Alterar Senha** | senha atual, nova senha, confirmação |
| 17 | `UserManagement.tsx` | Modal **Registrar Usuário** | nome, e-mail, senha |
| 18 | `FeatureFlagsPanel.tsx` | Formulário **Nova Feature Flag** | chave, descrição |
| 19 | `GenericSettingsPanel.tsx` | Formulário **Novo Parâmetro** | chave, valor, descrição |
| 20 | `SystemConfigPanel.tsx` | Edição de **Configurações do Sistema** | qualquer valor alterado (`localValues`) |

## Sem guarda (intencional) ⚠️

| Componente | Formulário/Campo | Motivo |
|---|---|---|
| `LoginForm.tsx` | Login | Tela pública; Gmail/GitHub também não avisam em telas de login |
| `PublicPortal.tsx` | Acompanhamento de OS (`/acompanhar`) | Portal público; a guarda é instalada apenas no app autenticado |
| `OSList.tsx` | Busca/filtros | Campo de busca não é "trabalho a preservar" |
| `OSConciliation.tsx` | Seleções/checkboxes | Apenas checkboxes e listas, sem texto livre |
| `TransitionSettingsPanel.tsx` | Transições de status | Apenas toggles, sem texto livre |
| `WorkflowVisualizer.tsx` | — | Visualização apenas, sem formulário |

## Manutenção

- **Novo formulário com texto digitável**: importe o hook e chame
  `useUnsavedChangesGuard(<estado sujo>)` no componente.
- **Regra de ouro**: só considere "sujo" quando o usuário realmente interagiu
  (campo preenchido, modal aberto com dados). Campos de busca/filtro e telas de
  login **não** devem disparar o aviso.
