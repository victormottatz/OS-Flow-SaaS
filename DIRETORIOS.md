# Estrutura de Diretórios - MGV Sistema Integrado

Este documento serve como mapa de navegação e referência rápida para desenvolvedores e agentes inteligentes, detalhando a função de cada diretório e os padrões de organização do projeto.

---

## 📂 Mapa Geral de Pastas

A estrutura básica do projeto está organizada da seguinte forma:

```
MGV-Assistência-Técnica/
├── .agents/                 # Configurações locais do agente inteligente e workflows
├── docs/                    # Documentação do projeto e especificações de negócio
│   └── design/              # Arquivos de mockups de UI/UX e vídeos demonstrativos
├── prisma/                  # Banco de dados (Schema e Migrations do ORM Prisma)
├── src/                     # Código-fonte da aplicação (Frontend & APIs do Backend)
│   ├── components/          # Componentes React (Frontend)
│   ├── contexts/            # Contextos do React para gerenciamento de estado
│   ├── controllers/         # Controladores da API Express (Backend)
│   ├── database/            # Conexão e inicialização do Prisma Client
│   ├── domain/              # Modelagem de regras de negócio puras do domínio
│   ├── events/              # Eventos/mensageria interna da aplicação
│   ├── isaias/              # Módulo do agente/regras inteligentes
│   ├── middlewares/         # Middlewares Express (Autenticação, Governança)
│   ├── routes/              # Definições de rotas da API Express
│   └── services/            # Serviços de integração (Bling, WhatsApp, Auditoria)
├── scripts/                 # Scripts utilitários e de automação estruturados
│   ├── migrations/          # Scripts para importação de dados do sistema legado
│   ├── seeds/               # População de dados iniciais do banco
│   ├── tests/               # Testes de fumaça (smoke tests) e homologações
│   ├── utils/               # Conversores, corretores de dados e auxiliares
│   └── maintenance/         # Manutenção do banco de dados e rotinas do servidor
├── temp/                    # Arquivos temporários e logs arquivados
├── backups/                 # Backups semanais e backups de inicialização em JSON
├── dist/                    # Build compilada de produção da aplicação
└── node_modules/            # Dependências NPM do projeto
```

---

## 🔍 Descrição Detalhada dos Diretórios

### 📁 [.agents](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/.agents)
Contém workflows específicos de regras de engenharia de software sênior da MGV e instruções personalizadas que guiam as ações de agentes automatizados.

### 📁 [docs](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/docs)
Centraliza a documentação de processos e negócios:
*   [contexto_sistema_mgv.md](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/docs/contexto_sistema_mgv.md): Arquitetura, stack tecnológica e regras corporativas.
*   [documento_discovery.md](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/docs/documento_discovery.md): Entendimento do produto e integrações com Bling.
*   [manual_uso_boas_praticas.md](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/docs/manual_uso_boas_praticas.md): Manual operacional para faturamento, estoque e migrações.
*   [risk_analysis.md](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/docs/risk_analysis.md): Análise de riscos e mitigação de gargalos de concorrência.
*   [sync_final_report.md](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/docs/sync_final_report.md): Relatório de auditoria e sincronização com Bling.
*   [design/](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/docs/design): Armazena o fluxo e telas de UI/UX gerados pela ferramenta Stitch.

### 📁 [prisma](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/prisma)
Centraliza a infraestrutura de modelagem de banco de dados SQL (PostgreSQL/Supabase). Contém o [schema.prisma](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/prisma/schema.prisma) e o histórico de migrations do banco de dados.

### 📁 [src](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/src)
Onde reside a lógica de negócios da aplicação. Embora o frontend (React) e o backend (Express) residam juntos, a divisão interna é explícita:
*   **Interface (React):** `components/`, `contexts/`, [App.tsx](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/src/App.tsx) e [main.tsx](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/src/main.tsx).
*   **Servidor/API (Express):** `controllers/`, `routes/`, `middlewares/`, `services/`, `domain/`, `events/`.

### 📁 [scripts](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/scripts)
Agrupa tarefas manuais ou automatizadas executadas no terminal:
*   [migrations/](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/scripts/migrations): Contém o pipeline de migração do sistema desktop antigo (*SH Oficina*).
*   [seeds/](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/scripts/seeds): Criação de perfis padrão e ativação de feature flags da Skill Tree.
*   [tests/](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/scripts/tests): Scripts para validação automática de rentabilidade, base instalada e fluxos fiscais.
*   [utils/](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/scripts/utils): Conversores de XLS para CSV e scripts de ajuste/limpeza de telefones.
*   [maintenance/](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/scripts/maintenance): Ações de cleanup de banco, hotfixes de inicialização e limpeza de OSs duplicadas.

### 📁 [backups](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/backups)
Backups automáticos em formato JSON criados pelo servidor na inicialização (`boot`) ou na rotina semanal recorrente de segurança.

---

## 📌 Arquivos Importantes na Raiz

*   [server.ts](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/server.ts): Ponto de entrada (Entrypoint) do servidor Node.js/Express. Responsável por iniciar a rotina de backups, inicializar a API e servir o frontend (Vite/dist).
*   [package.json](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/package.json): Definição de dependências e scripts NPM.
*   [vite.config.ts](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/vite.config.ts): Configuração do empacotador frontend Vite.
*   [tsconfig.json](file:///d:/HD/MGV/MGV_2026/MGV-Assist%C3%AAncia-T%C3%A9cnica/tsconfig.json): Regras do compilador TypeScript.
*   `.env`: Variáveis de ambiente locais (sensível, não versionado).
*   `database.json`: Cópia local/backup do banco para sincronias e auditoria de depuração `/api/debug-db`.
