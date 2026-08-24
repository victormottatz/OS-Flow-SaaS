# Regras do Projeto (MGV Assistência Técnica)

## Protocolo de Engenharia de Prompt e Otimização de Janela de Contexto

Para maximizar a eficiência e minimizar o consumo de tokens:

1. **Respostas Diretas e Didáticas (em Português do Brasil)**:
   - Eliminar saudações, introduções prolixas e premissas repetitivas.
   - Ir direto ao ponto técnico ou código solicitado.
   - Manter explicação clara e didática.

2. **Contexto Modular e Minimalista**:
   - Enviar apenas trechos de arquivos estritamente necessários ou diffs.
   - Evitar re-enviar histórico redundante ou arquivos inteiros quando modificações pontuais forem suficientes.

3. **Comandos e Códigos Acionáveis**:
   - Entregar código limpo e comandos de terminal prontos para execução.

4. **Memória de Longo Prazo**:
   - Manter decisões de arquitetura e progresso no `walkthrough.md`, `README.md` ou neste arquivo de regras (`AGENTS.md`).

## 👨‍🏫 Diretrizes de Apoio a Desenvolvedores Iniciantes

1. **Simplicidade de Código**:
   - Evitar criar abstrações excessivas, padrões de design complexos ou "over-engineering".
   - Priorizar código limpo, legível e de fácil manutenção por iniciantes.

2. **Comentários Didáticos**:
   - Sempre documentar blocos de lógica complexa com comentários curtos e didáticos diretamente no código (em português).

3. **Explicação de Impacto**:
   - Após propor ou realizar uma mudança de código, explicar sucintamente o que foi alterado e como testar/verificar o resultado.

## 📢 Protocolo de Notificação de Atualização (WhatsApp)

Sempre que concluir e aplicar uma nova funcionalidade, correção ou deploy no sistema de produção, o agente deve gerar de forma proativa uma sugestão de mensagem estruturada para que o proprietário envie no WhatsApp para a equipe da assistência técnica:
- **Formato:** Texto formatado com negritos (`*texto*`) compatíveis com o WhatsApp.
- **Estrutura:**
  - Título chamativo com emojis (ex: `🚀 *MGV ONE HUB - ATUALIZAÇÃO* 🚀`).
  - Resumo didático e direto de "O que muda na prática para vocês?".
  - Ações imediatas ou cuidados necessários (ex: recarregar a tela com Ctrl+F5, preencher NCM ou CEP).
  - Linguagem amigável, clara e acessível a leigos (atendentes e técnicos).

## 🛡️ Ambiente de Execução Restrito

- **Regra de Ouro (Inquebrável):** Qualquer desenvolvimento, elaboração de planos, refatoração de código, teste ou execução de comandos deve ser feito OBRIGATORIAMENTE no diretório de testes:
  `D:\HD\MGV\MGV_2026\MGV-Assistencia-Tecnica-TESTE`
- O diretório principal (`D:\HD\MGV\MGV_2026\MGV-Assistência-Técnica`) é tratado como ambiente de Produção/Master e **nunca** deve receber edições diretas sem instrução super explícita em contrário.

## 🚫 Proibição Absoluta do Navegador Automático (Economia de Tokens)

- **Regra Estrita:** O agente NUNCA deve usar o navegador (browser subagent) nem abrir abas de navegação autônomas.
- **Validações Visuais:** O agente deve sempre instruir o usuário a testar no próprio navegador e solicitar que ele envie capturas de tela (prints) ou logs do console caso haja qualquer questão visual ou comportamental a ser analisada.

## 🔔 Protocolo de Pop-up e Notificações In-App (UpdatePopup)

Sempre que concluir e aplicar uma nova atualização no sistema principal (Deploy), o agente deve, obrigatoriamente e de forma proativa:
1. **Atualizar o `UpdatePopup.tsx`**: Modificar o arquivo para incrementar a versão e atualizar o resumo visual das novas funcionalidades implementadas.
2. **Atualizar a Notificação no Sino**: Garantir que a chamada de `addNotification` no `UpdatePopup.tsx` seja atualizada para a manchete da nova versão, para que os usuários recebam a notificação dentro do próprio sistema.

## 🛠️ Workflows e Processos Padronizados

O projeto conta com uma extensa biblioteca de workflows unificada na pasta `.agents/workflows`. Para garantir a padronização e o uso das melhores práticas:
1. **Consulta Proativa**: Sempre que for iniciar uma tarefa que se enquadre nas categorias disponíveis (ex: criar nova API, componente, testes, deploy, segurança), o agente deve propor e utilizar o workflow correspondente.
2. **Processos Core**: O agente deve estar ciente e utilizar os documentos de fluxo principal (`01_PRD_REQUIREMENTS`, `02_ARCHITECTURE_DESIGN`, `03_TASKS_VERIFICATION`, `04_REVIEW_RELEASE`) para estruturar grandes entregas.
3. **Categorias Cobertas**: `ai-tools`, `creative`, `database`, `debugging`, `deployment`, `development`, `documentation`, `git`, `security` e `testing`.

## 🦁 14 Rules (Lion Lab) - Resumo de Otimização de Tokens

1. **Segurança**: Zero *Service Role*/direct-writes no Frontend; rotas e banco 100% validados.
2. **Async**: I/O bloqueante proibido; *Async-first* para tudo. *Background tasks* para processos longos.
3. **Multi-Tenant**: Filtrar `company_id` sempre via sessão; RLS habilitado obrigatoriamente.
4. **Secrets**: Criptografar chaves de terceiros no DB; banir logs de dados sensíveis.
5. **Sessão**: Cookies restritos (`httpOnly`, `secure`, `sameSite=lax`).
6. **Arquitetura**: `Routers` apenas repassam requisições; `Services` detêm toda a regra de negócio.
7. **Credenciais**: Hashing forte (Bcrypt cost=12) e senhas com alta entropia.
8. **Erros**: Nunca silencie exceções; propague `X-Request-ID`; retorne JSON padronizado.
9. **Dependências**: Restringir libs supérfluas; rodar auditorias (`npm audit`) antes da instalação.
10. **Test First**: TDD (Red/Green/Refactor); 80% coverage em regras de negócio.
11. **API REST**: Padrão estrito de verbos HTTP e rotas pluralizadas.
12. **Commits**: Conventional commits rigorosos (`feat:`, `fix:`, `chore:`).
13. **Ambiente**: DBs isolados; `.env` segregados (DEV x PROD); *Feature flags* para WIP.
14. **Docs as Code**: Código auto-documentado elimina comentários óbvios; docstrings explícitos em funções chave.
