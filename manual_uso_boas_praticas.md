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

### 3. Conexão com o ERP Bling
A integração do Bling automatiza a exportação dos cadastros para não haver retrabalho financeiro.
- **Autorização:** Apenas uma vez por mês (ou quando necessário), o Gerente deve ir na aba "Sincronização" e clicar em **Conectar com o Bling**. 
- Uma vez autorizado, o MGV manterá a sessão aberta em nuvem se atualizando sozinho de forma contínua.
- **Sincronização de Peças e Clientes:** Ao adicionar um novo Cliente ou Peça no MGV, clique no botão de "Sincronizar" ao lado da peça/cliente. O MGV irá verificar se existe no Bling e injetar lá automaticamente.

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
