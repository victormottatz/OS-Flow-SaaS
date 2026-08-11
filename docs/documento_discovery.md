# Documento Discovery: MGV One Hub

> [!NOTE]
> Este documento resume a fase de Descoberta (Discovery) e o mapa arquitetural do projeto **MGV One Hub**. O objetivo é guiar novos desenvolvedores e stakeholders sobre o contexto, a stack tecnológica e as decisões estruturais.

## 1. Visão Geral do Produto
O MGV One Hub é um sistema web integrado projetado para substituir soluções legadas desktop (ex: SH Oficina). Ele centraliza a gestão de Ordens de Serviço (OS), clientes, peças/estoque, proporcionando também um Portal Público para que o cliente final acompanhe o status do seu reparo usando o CPF e o número da OS.

## 2. Tecnologias e Stack (O "Motor" do Sistema)

- **Frontend (UI/UX):** React.js com Vite. Interfaces construídas com TailwindCSS usando uma estética premium de "Glassmorphism Dark" (vidro translúcido, gradientes com teal e indigo).
- **Backend:** Node.js com Express e TypeScript. O backend roda em conjunto com o frontend durante o desenvolvimento, consumindo APIs e servindo dados.
- **Banco de Dados (DB):** PostgreSQL hospedado na nuvem pelo **Supabase**.
- **ORM (Mapeamento de Dados):** **Prisma**. Toda a comunicação com o banco é feita de maneira tipada garantindo segurança (schema no `prisma/schema.prisma`).
- **Autenticação:** Supabase Auth integrado ao backend com validação de Tokens JWT. Usuários têm perfis: `OWNER` (Administrador) e `EDITOR` (Técnicos).
- **Integração Externa:** **Bling ERP V3**. Utilizado via fluxo de OAuth 2.0.

## 3. Arquitetura e Decisões Técnicas

### Banco de Dados na Nuvem (Pool de Conexão)
Devido a restrições de hospedagens modernas (como Render) que não suportam IPv6 por padrão, a comunicação do Prisma com o Supabase é feita **exclusivamente via Connection Pooler (IPv4)**. 
- *Decisão Técnica:* A variável `DATABASE_URL` deve sempre utilizar os domínios `pooler.supabase.com` e a porta `5432` (ou `6543`), adicionando o sufixo `?pgbouncer=true`.

### Integração Bling (OAuth2)
A sincronização com o Bling é vital. Foi decidido utilizar um modelo de atualização automática e transparente de Tokens.
- O fluxo de autorização (`/api/integration/bling/connect`) redireciona o usuário para o Bling.
- A aplicação escuta a URL de Callback, captura o código de autorização e o troca por um `access_token` e `refresh_token`.
- Esses tokens são salvos de forma segura no banco de dados na tabela `BlingConfig`.
- Sempre que a aplicação vai sincronizar Clientes ou Produtos com o Bling, ela verifica a validade do token. Se estiver expirando, ela usa o `refresh_token` automaticamente.
- **Emissão Fiscal (NFe/DANFE):** A integração agora conta com faturamento completo de Ordens de Serviço (painel Bling Sandbox), permitindo emitir Notas Fiscais, consultar o status da SEFAZ, simular erros fiscais e pré-visualizar o DANFE diretamente pelo sistema.

### O Quadro Kanban
> [!TIP]
> O painel de OS foi projetado para alta interatividade usando `@dnd-kit/core` para *Drag and Drop*.

- Os cartões fluem entre colunas (`Orçamento`, `Aguardando Peças`, `Execução`, etc.).
- A movimentação dispara atualizações otimistas na interface para não haver atraso (lag) percebido, enviando a requisição para o banco em background.
- O scroll é isolado por coluna. Se uma coluna tiver 50 OS e a outra 2, a tela permanece rígida e apenas a lista interna rola.

## 4. Estrutura de Entidades (Prisma Schema)
As tabelas principais do nosso ecossistema são:
1. `User`: Funcionários (Técnicos, Gerentes).
2. `Client`: Clientes da Assistência.
3. `Part` (Peça/Estoque): Produtos cadastrados.
4. `OrdemServico` (OS): Coração do sistema. Liga um Cliente a um Equipamento, armazena o defeito e as peças utilizadas.
5. `BlingConfig`: Configurações de sincronização.

## 5. Próximos Passos (Roadmap de Evolução)
- **Relatórios:** Criar um painel de métricas (Gráficos) calculando o lucro, peças mais vendidas e produtividade por técnico.
- **WhatsApp Webhooks:** Envio automático de mensagens pelo WhatsApp quando o status da OS mudar.
