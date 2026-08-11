# Histórico do Projeto — MGV Assistência Técnica

## Visão Geral

O **MGV One Hub** é um sistema web ERP/gestão de oficina construído do zero para uma assistência técnica brasileira, substituindo o sistema legado desktop **"SH Oficina"**. O projeto cobre todo o ciclo de vida de uma Ordem de Serviço (OS) — desde a entrada do equipamento, passando por diagnóstico, orçamento, alocação de peças, manutenção, teste de estresse, emissão de NF-e, até a retirada e pagamento pelo cliente.

O sistema roda simultaneamente em **intranet local** (`192.168.15.18:3000`) e na **nuvem via Render**, com fluxo OAuth híbrido compartilhado via Supabase.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19 + Vite 6, TailwindCSS 4, Lucide React, Motion (Framer Motion) |
| **Backend** | Node.js + Express 4 + TypeScript (monorepo com `server.ts`) |
| **Banco de Dados** | PostgreSQL via Supabase (cloud), acessado por Prisma Client 6.19 |
| **Autenticação** | JWT (jsonwebtoken), bcryptjs, RBAC com 7 níveis de perfil |
| **Integrações** | Bling ERP V3 (OAuth 2.0), WhatsApp API, Google Gemini AI |
| **Processamento de Imagens** | Sharp (avatar), Supabase Storage |
| **Planilhas/PDFs** | xlsx (importação e conciliação), pdf-parse |
| **Build** | Vite (frontend), esbuild (backend bundle → `dist/server.cjs`) |
| **Deploy** | Render (Blueprint via `render.yaml`) + Windows Intranet local |

---

## Funcionalidades Implementadas

### 1. Autenticação e Controle de Acesso (RBAC)

Sistema completo de autenticação JWT com 7 níveis de perfil hierárquico:

| Nível | Perfil |
|---|---|
| 1 | `OWNER` |
| 2 | `ADMIN` |
| 3 | `SUPERVISOR` |
| 4 | `EDITOR` |
| 5 | `ATTENDANT` |
| 6 | `TECHNICIAN` |
| 7 | `FINANCIAL` |

- Login com email/senha e hashing bcrypt
- Middleware de verificação de token em todas as rotas protegidas
- Controle de permissões por ação (criar, editar, excluir, visualizar)
- Painel de administração para gestão de usuários e perfis

### 2. Gestão de Clientes (CRM)

Módulo completo de gestão de clientes com:

- **CRUD completo** — cadastro, edição, exclusão lógica (soft delete)
- **Tabela de dados** com busca, filtros e ordenação
- **Visualização 360°** — todos os dispositivos e OS associados a um cliente
- **Importação em massa** — scripts para importar clientes do SH Oficina via XLSX
- **Integração Bling** — sincronização automática de clientes com o ERP Bling V3
- **Portal público** — acesso externo por CPF/CNPJ

### 3. Gestão de Equipamentos (Base Instalada)

- **CRUD de equipamentos** vinculados a clientes
- **Tipos, marcas, modelos e números de série**
- **Controle de garantia** (duração e data de aquisição)
- **Notas livres** por equipamento (DeviceNote)
- **Categorias de equipamento** com checklists padrão
- **Importação legado** — scripts de migração do SH Oficina

### 4. Ordens de Serviço (OS) — Core do Sistema

O modelo central do sistema — `OrdemServico` — gerencia todo o ciclo:

#### Máquina de Estados (8 estados)

```
ORCAMENTO → AGUARDANDO_AVALIACAO → AGUARDANDO_AUTORIZACAO
→ AGUARDANDO_PECA → EM_MANUTENCAO → PRONTO_RETIRADA
→ PAGO_PRONTO_RETIRADA → FINALIZADO
```

Implementada via `os.state-machine.ts` com tabela de transições declarativa.

#### Funcionalidades da OS

- **Criação inteligente** — busca de cliente, seleção de equipamento, entrada de defeito
- **Diagnóstico técnico** — registro de laudo e observações
- **Peças utilizadas** (JSON) — registro de peças consumidas na reparação
- **Mão de obra** — valor cobrado por serviço
- **Checklists de entrada e saída** — checklist obrigatório antes de iniciar e ao finalizar
- **Laudo fotográfico** — registro de fotos do equipamento
- **Teste de estresse** — fluxo de 30 minutos de teste (feature flag)
- **Motivo de encerramento** — enum: REPARO_CONCLUIDO, ORCAMENTO_RECUSADO, DESCARTE_CLIENTE_RETIRA, DESCARTE_OFICINA
- **Flag de recorrência** — identifica equipamentos com problemas recorrentes
- **Integração Bling** — envio de OS para geração de NF-e

#### Políticas de Serialização (`os.policies.ts`)

Bloqueio de finalização de OS se peças de alto valor não tiverem número de série registrado.

### 5. Kanban Board

Quadro Kanban visual com **drag-and-drop** para gestão de fluxo de OS:

- Colunas independentes com rolagem própria
- Cards com informações resumidas (cliente, equipamento, status, tempo)
- Customização de scrollbar
- Atualização em tempo real via WebSocket/EventBus

### 6. Módulo de Estoque (Parts)

- **CRUD de peças** com níveis de estoque
- **Controle de estoque mínimo** com alertas
- **Estoque reservado** (peças comprometidas em OS)
- **Serialização obrigatória** para peças de alto valor
- **Localização física** da peça no estoque
- **Fornecedor** vinculado
- **Módulo Enterprise de Estoque** — controles avançados de movimentação

### 7. Integração Bling ERP V3

Integração completa com o sistema fiscal Bling:

- **OAuth 2.0** — autenticação e renovação automática de tokens
- **Sincronização de clientes** — envio de clientes do MGV para o Bling
- **Sincronização de produtos** — envio de peças/estoque como produtos no Bling
- **Criação de pedidos de venda** — OS convertida em pedido no Bling
- **Emissão de NF-e** — geração de nota fiscal eletrônica via SEFAZ
- **Visualização de DANFE** — download do documento fiscal em PDF
- **Sandbox de testes** — tela dedicada para testar a integração
- **Status de conexão** — indicador visual da saúde da conexão OAuth

### 8. Notificações WhatsApp

- **Templates de mensagens** para diferentes eventos (OS pronta, orçamento, etc.)
- **Histórico de mensagens** por OS (MessageHistory)
- **Triggers manuais** — envio sob demanda pelo atendente
- **Feature flag** — habilitação progressiva via Skill Tree

### 9. Portal Público do Cliente

Página pública (`/acompanhar`) onde o cliente pode:

- Acessar sem login (apenas CPF/CNPJ + número da OS)
- Verificar o status atual da OS
- Visualizar detalhes do equipamento e diagnóstico
- Histórico de status anteriores

### 10. Conciliação de OS

Serviço sofisticado de conciliação (`OSConciliatorService`):

- **Parser de PDFs** — extrai dados de "Fechamento de Caixa" diários
- **Parser de XLSX** — importa registros de pagamento
- **Leitura de planilhas** de equipamentos prontos para retirada
- **Scoring de confiança** — algoritmo com pesos configuráveis
- **Regras de conciliação** — configuração via `conciliation.config.ts`
- **Batch de conciliação** — registro de cada rodada de conciliação
- **Undo** — capacidade de desfazer conciliações (schema pronto)

### 11. Sistema de Auditoria (AuditLog)

- **Log completo** de todas as ações significativas no sistema
- **Entidade, ação, valores antigos e novos**
- **Rastreamento de usuário** e IP de origem
- **Fonte** (web, API, migração)
- **Event-driven** — EventBus dispara eventos que o AuditService escuta e registra

### 12. Feature Flags (Skill Tree)

Sistema gamificado de ativação progressiva de funcionalidades, inspirado em árvores de habilidades de jogos:

| Flag | Funcionalidade |
|---|---|
| `WHATSAPP_AUTO_MESSAGES` | Mensagens automáticas WhatsApp |
| `FISCAL_NFE_EMISSION` | Emissão de NF-e |
| `FINANCIAL_DASHBOARD` | Dashboard financeiro |
| `STOCK_RESERVATION` | Reserva de peças |
| `STRESS_TEST_FLOW` | Fluxo de teste de estresse (30min) |
| `MANDATORY_CHECKLIST` | Checklists obrigatórios |
| `CLIENT_PORTAL` | Portal do cliente |
| `AUTOMATIONS_AND_ALERTS` | Automações inteligentes |
| `INTELLIGENCE_ARTIFICIAL_DIAG` | Diagnóstico por IA (Gemini) |

### 13. Dashboard e Painel de Configurações

- **Dashboard** — KPIs, métricas, resumos visuais
- **Painel de configurações** — configurações do sistema, flags, gestão de usuários
- **Perfil do usuário** — edição de nome, avatar, bio e senha
- **Avatar upload** — compressão via Sharp, armazenamento no Supabase Storage

---

## Arquitetura do Backend

### Domain-Driven Design

- **`src/domain/os/os.state-machine.ts`** — máquina de estados declarativa para transições de OS
- **`src/domain/os/os.policies.ts`** — políticas de negócio (serialização, finalização)
- **`src/domain/os/MigrationRulesEngine.ts`** — regras para migração de dados legados

### Event-Driven Architecture

- **EventBus customizado** (`src/events/`) com eventos tipados:
  - `OS_CREATED`, `OS_STATUS_CHANGED`
  - `CLIENT_CREATED`
  - `PART_STOCK_LOW`
  - etc.
- **AuditService** escuta eventos e escreve logs de auditoria

### Arquitetura Híbrida Cloud/Intranet

- Tokens de produção armazenados no Supabase (cloud)
- Servidor Express local lê e renova tokens automaticamente
- Render hospeda o callback OAuth e serve como portal público
- Máquinas locais servem a UI de intranet

---

## Scripts de Migração de Dados

### Migração do Legado (SH Oficina → MGV)

| Script | Descrição |
|---|---|
| `migration_clientes.ts` | Migração de clientes do SH Oficina |
| `migration_equipamentos.ts` | Migração de equipamentos |
| `migration_os.ts` | Migração de ordens de serviço históricas |
| `migration_estoque.ts` | Migração de estoque/peças |
| `import_legacy.ts` | Orquestrador principal da importação legado (com dry-run) |
| `migrate_json_to_prisma.ts` | Converte `database.json` flat-file para Prisma/Supabase |
| `import_all_clients.ts` | Importação em massa de clientes |
| `import_temp_os_xls.ts` | Importa dados de OS de arquivos XLS temporários |

### Scripts de Suporte

| Pasta | Descrição |
|---|---|
| `scripts/seeds/` | Seed de admin e feature flags |
| `scripts/maintenance/` | Sincronização Supabase, limpeza de banco |
| `scripts/utils/` | Conversores XLS→CSV, utilidades de correção |

### Scripts Recentes (Não Commitados)

- `pre_audit_and_backup.ts` / `post_audit.ts` — auditoria pré/pós migração
- `batch_sync_bling.ts` — sincronização em lote com Bling
- `clear_db.ts` — limpeza de banco de dados
- `fix_os_dates.ts` — correção de datas de OS
- `search_excel_clients.cjs` — busca de clientes em planilhas

---

## Deploy e Infraestrutura

### Duplo Deploy

| Ambiente | URL | Descrição |
|---|---|---|
| **Cloud** | `MGV-Assistencia-Tecnica.onrender.com` | Produção via Render Blueprint |
| **Local** | `192.168.15.18:3000` | Intranet da oficina |

### Detalhes Técnicos

- **`render.yaml`** — Blueprint do Render para deploy automático
- **Bundle esbuild** — backend empacotado em `dist/server.cjs`
- **Vite** — frontend buildado com code splitting
- **Intranet local** — inicialização via script `.vbs` oculto no Windows
- **Backup semanal** — backups automáticos em JSON

---

## Git Histórico (Commits)

```
28f53e7 feat: refatora painel de configurações, adiciona perfil de usuário, conciliação de OS
bc04bed fix: mount api routes correctly in server
20c4324 fix: mount api routes correctly in server and fix auth middleware
96cbd44 feat: Conclusão da Refatoração Arquitetural (Sprints 1-6)
8104aa2 refact: migra rotas do backend para o Prisma/Supabase e ajusta roteamento SPA
11cb945 feat: update convert script to Latin1, remove duplicates, add gitignores
0458372 fix: ignorar EXPOTACAO-SH OFICINA no watcher do vite para prevenir EBUSY
71ecb26 feat: Bling V3 production release. Batch progress, validations, E2E test
6f055a0 feat: migração de dados completa, scripts de migração e atualização do schema
78035bf feat: adicionar travas de fluxo para qualidade de OS e scripts de homologação E2E
274e0b6 style: remover credenciais de teste da tela de login
0a458f6 fix: forcando redirect_uri de produção na autenticação do Bling
f0ded8b chore: adicionar endpoint /api/debug-db para diagnóstico
64bee12 style: adicionar rolagem independente por coluna no KanbanBoard
b4111a2 feat: implementar controle de acesso e permissões baseado em papéis (RBAC)
0f88015 debug: adiciona endpoint /api/debug-db
a9ef7d2 feat: adiciona script de sinc e atualiza database.json com dados do Supabase
5bb83ff fix: utiliza porta dinâmica process.env.PORT para deploy no Render
8eef05d feat: otimiza pesquisa de clientes e cadastro inteligente de equipamentos na OS
32eb35e feat: implementa checklist de entrada e laudo fotográfico (OS)
8f14549 feat(estoque): Módulo Enterprise de Estoque & Serialização Obrigatória
2e0b7c0 Initial commit: MGV Sistema Integrado
86b997d Initial commit: MGV Sistema Integrado V1.0
6d551bd Initial commit
```

**Total: 24 commits** — de commit inicial até refatoração arquitetural recente.

---

## O Que Está Planejado

| Prioridade | Funcionalidade |
|---|---|
| Alta | Diagnóstico por IA (integração Google Gemini — esboçada, não implementada) |
| Alta | Dashboard financeiro avançado com gráficos de rentabilidade |
| Média | Automações e alertas inteligentes (deteção de OS ociosas, auto-encerramento) |
| Média | Reserva de peças com sugestões de compra |
| Baixa | Importação de NF-e de compra XML (fase 2 de custos) |

---

*Documento gerado em Julho 2026 — Projeto MGV Assistência Técnica*
