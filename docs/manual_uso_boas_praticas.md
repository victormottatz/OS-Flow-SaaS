# Manual de Uso e Boas Práticas (MGV)

Este manual tem como objetivo guiar a equipe técnica, gestores (uso diário) e desenvolvedores (manutenção do código) na correta utilização do MGV Assistência Técnica.

---

## 🛠️ Para Desenvolvedores e Mantenedores

### 1. Boas Práticas de Código e Estilos
> [!IMPORTANT]
> O design visual deste sistema é um diferencial. Não crie componentes genéricos (cores sólidas e chapadas).
- **CSS e Tailwind:** Utilize sempre o esquema de transparência, gradientes (`bg-gradient-to-tr`), e efeitos de vidro (`glassmorphism-dark`). 
- As barras de rolagem devem usar a classe `.custom-scrollbar` para manter o minimalismo.
- Sempre que criar um formulário ou input, aplique animações suaves (`focus:ring-teal-500`, `transition duration-200`).

### 2. Tratamento de Variáveis de Ambiente (.env)
Se o sistema for migrado de hospedagem, garanta que as chaves obrigatórias estejam preenchidas:
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Usadas para autenticação do lado do frontend.
- `DATABASE_URL`: A chave de conexão do Prisma. **Regra de ouro:** Deve sempre ser a rota IPv4 (Session/Transaction Pooler) contendo `?pgbouncer=true`.
- `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET`: Credenciais do App no Bling. Lembre-se que o Bling exige que a **URL de Retorno** cadastrada no painel deles seja estritamente igual à URL onde a aplicação está hospedada.

### 3. Migrações de Banco de Dados
Sempre que o modelo no `prisma/schema.prisma` for alterado, siga o fluxo:
1. `npx prisma format` (para alinhar o arquivo).
2. `npx prisma migrate dev --name <nome_da_mudanca>` (para aplicar na base de desenvolvimento e gerar os arquivos SQL de tracking).
3. `npx prisma generate` (para atualizar os tipos Typescript).

### 4. Migração de Dados Legados (database.json para Nuvem)
Para importar os dados do sistema local antigo (JSON) para o banco Postgres/Supabase em nuvem:
1. Certifique-se de que o arquivo `database.json` de backup está na raiz da pasta do projeto.
2. Execute o comando `npx tsx scripts/migrate_json_to_prisma.ts`.
3. **CUIDADO:** Este script apaga as tabelas atuais antes de migrá-las (sobrescrevendo os dados de nuvem). Utilize apenas em cenários de inicialização de homologação.

---

## 👨‍🔧 Para Gestores e Técnicos (Usuários Finais)

### 1. Login e Hierarquia
- Existem dois tipos de perfis: **OWNER** (Donos) e **EDITOR** (Técnicos). 
- Técnicos podem criar, editar e movimentar as Ordens de Serviço livremente. No entanto, ações destrutivas (exclusão de registros complexos) são restritas por segurança do banco.
- Ao cadastrar um novo técnico, ele usará o e-mail e a senha definidos na tela de cadastro para acessar.

### 2. Fluxo Kanban (Gestão de OS)
> [!TIP]
> Use a interface a seu favor. O Kanban foi feito para ser visual e intuitivo!
- A tela central é o Kanban. Arraste as ordens de serviço entre os status.
- **Orçamento:** Para aparelhos recém-recebidos.
- **Aguardando Peças:** Se for necessário parar o conserto.
- **Execução:** O que os técnicos estão mexendo hoje.
- **Pronto:** Consertado, avisar o cliente para buscar.
- **Entregue / Cancelado:** O processo chegou ao fim.

### 3. Conexão com o ERP Bling e Emissão de NFe
A integração do Bling automatiza a exportação dos cadastros para não haver retrabalho financeiro, bem como a emissão da NF.
- **Autorização:** Apenas uma vez por mês (ou quando necessário), o Gerente deve ir na aba "Sincronização" e clicar em **Conectar com o Bling**. 
- Uma vez autorizado, o MGV manterá a sessão aberta em nuvem se atualizando sozinho de forma contínua.
- **Sincronização de Peças e Clientes (Webhooks):** Clientes e produtos cadastrados ou atualizados diretamente no painel do Bling ERP V3 são espelhados em tempo real para o banco de dados do MGV de forma totalmente automática, eliminando cadastros duplicados.
- **Faturamento e DANFE:** Ao finalizar uma OS, ela aparece no *Painel de Integração Fiscal (Sandbox)*. Lá, o Gerente pode comandar a "Emissão de Nota", consultar a situação da SEFAZ e, se aprovado, imprimir o Documento Auxiliar (DANFE) e visualizar a chave de acesso.
- **Importação de XML de Compra:** No painel de Estoque, o gerente pode clicar em **Importar XML NFe** para fazer upload do XML de compra do fornecedor. O sistema dará entrada automática nas peças no estoque e recalculará o **Custo Médio Ponderado** de forma automática.
- **Reserva Lógica de Estoque:** Peças adicionadas a ordens de serviço em orçamento ou manutenção são reservadas logicamente, reduzindo o saldo disponível para outras ordens sem mexer no estoque físico real da oficina. A baixa física e contábil final ocorre apenas ao faturar a OS (mudar status para "Finalizado"). Caso a OS seja cancelada ou reaberta, o sistema cancela a reserva automaticamente.

### 4. Portal Público (Consulta do Cliente)
Para desafogar os canais de atendimento (WhatsApp/Telefone):
- Passe o link do portal público (ex: `seusite.com/consulta`) para os clientes.
- Eles podem buscar o andamento do aparelho usando o **CPF** fornecido no ato de entrada junto com o **Número da OS** ou Código de Rastreamento.
- A tela dirá exatamente em que coluna do Kanban o aparelho está, trazendo tranquilidade.

### 5. Boas Práticas no Cadastro de OS
> [!WARNING]
> Mantenha a clareza nas descrições!
- Preencha corretamente o problema relatado e a lista de peças associadas. Os valores das peças somam-se automaticamente ao orçamento final do cliente.
- Documente tudo: a marca, o modelo, o número de série e até observações sobre riscos/arranhões. Evita conflitos com os clientes na devolução!
