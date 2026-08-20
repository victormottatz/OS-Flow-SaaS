# 🚀 Validação da Pasta Teste e Aplicação na Pasta Principal (MGV One Hub)

> **Uso:** cole o conteúdo da seção **"Prompt para o Agente"** no seu agente do
> Antigravity (ou abra este arquivo e peça para o agente segui-lo literalmente).

---

## 🗺️ Contexto (o agente precisa saber disso)

Existem **duas pastas do mesmo sistema** MGV One Hub nesta máquina:

| Pasta | Caminho | Porta | Banco | Função |
|---|---|---|---|---|
| **Teste** | `D:\HD\MGV\MGV_2026\MGV-Assistencia-Tecnica-TESTE` | 3001 | PostgreSQL local `postgres_teste` | Ambiente de desenvolvimento/validação (onde as mudanças são feitas e testadas) |
| **Principal** | `D:\HD\MGV\MGV_2026\MGV-Assistência-Técnica` (com acento) | **3000** | PostgreSQL local `postgres` | Ambiente **em produção local** (é o que a equipe usa) |

> ⚠️ **Não confundir:** existe também `D:\HD\MGV\MGV_2026\MGV-Assistencia-Tecnica` (sem acento), mas ela **não tem `package.json`** — ignore essa pasta.

O fluxo desejado é: **1) validar** tudo na pasta Teste → **2) copiar** os arquivos de código para a pasta Principal → **3) validar** novamente na Principal → **4) reiniciar o servidor da porta 3000**.

---

## ✅ O que foi alterado na pasta Teste (escopo a validar e aplicar)

### A. Logo WebP V3.0 (última tarefa)
- **Novo componente:** `src/components/AppLogo.tsx` — renderiza a logo WebP com fallback automático para PNG (detecta suporte a WebP via `canvas.toDataURL`; se falhar o load, troca para o PNG via `onError`).
- **Novo arquivo estático:** `public/logos/LOGO V3.0 (3).webp` (copiado de `docs/design/LOGO V3.0 (3).webp`).
- **Referências atualizadas para usar o `AppLogo`:**
  - `src/components/OSList.tsx` (template de impressão do recibo, ~linha 774)
  - `src/components/OSManager.tsx` (template de impressão do termo, ~linha 461)
  - `src/components/LoginForm.tsx` (~linha 109)
  - `src/components/Navbar.tsx` (~linha 84)

### B. Guarda de alterações não salvas (`beforeunload`, padrão Gmail/GitHub)
- **Novo:** `src/utils/unsavedChanges.ts` (contador global + listener `beforeunload`)
- **Novo:** `src/utils/unsavedChanges.spec.ts` (5 testes unitários)
- **Novo:** `src/hooks/useUnsavedChangesGuard.ts` (hook reutilizável)
- **Novo:** `docs/formularios_e_guarda_alteracoes.md` (inventário de todos os formulários)
- **Modificados:** `src/App.tsx` (registro global da guarda) e os componentes com formulários: `OSManager.tsx`, `ClientManager.tsx`, `KanbanBoard.tsx`, `StockManager.tsx`, `DashboardView.tsx`, `FiscalPanel.tsx`, `OSWhatsAppPanel.tsx`, `ProfileSettings.tsx`, `UserManagement.tsx`, `FeatureFlagsPanel.tsx`, `GenericSettingsPanel.tsx`, `BlingSandbox.tsx`, `SystemConfigPanel.tsx`.

### C. CEP e e-mail completos no "Detalhes Cadastrais" do cliente
- `src/components/ClientManager.tsx` (exibição do CEP, cidade/UF e e-mail sem truncamento)
- `src/controllers/clients.controller.ts` (retorno do CEP/cidade/UF na API)

### D. Configuração do ambiente de teste (⚠️ NÃO copiar para a Principal)
- `iniciar_mgv_teste.bat` ganhou `set DISABLE_HMR=true` — **isso é exclusivo do teste** para o usuário não perder progresso com reload automático. A pasta Principal **não** deve receber essa mudança (lá o HMR ativo não é problema para a equipe, e a mudança não foi solicitada para produção).

---

## ⚠️ Regras críticas para a cópia (o agente DEVE respeitar)

1. **NUNCA copiar:** `.env`, `.env.local`, `node_modules`, `dist`, `.freebuff`, `Dados.MDB`, bancos locais (`*.db`, `*.sqlite`, `postgres_teste`), nem `iniciar_mgv_teste.bat`.
2. Os arquivos `.env` das duas pastas são **diferentes** (banco `postgres` vs `postgres_teste`) — copiar o `.env` quebraria a pasta Principal.
3. Copie **apenas os arquivos de código e estáticos** listados no escopo (A, B, C). Use `cp`/`robocopy` por arquivo, nunca a pasta inteira.
4. A pasta Principal está **rodando na porta 3000** — após copiar os arquivos, o servidor precisa ser **reiniciado** para carregar as mudanças. Reiniciar o processo da porta 3000 é permitido (é o ambiente local de desenvolvimento, não um servidor remoto).
5. Valide **antes** de copiar (na Teste) e **depois** de copiar (na Principal): `npm run lint`, `npm test`, `npm run build`.
6. `public/logos/LOGO V3.0 (3).webp` deve existir em **ambas** as pastas após a cópia.
7. O arquivo `docs/formularios_e_guarda_alteracoes.md` também deve ser copiado (é documentação).

---

## 🧪 Comandos de validação (rodar nas DUAS pastas)

```bash
npm run lint    # typecheck (tsc --noEmit) — sem erros
npm test        # suíte unitária — esperado: 44 testes passando (9 arquivos)
npm run build   # build do servidor + frontend — sem erros
```

Verificação manual extra:
- Abrir a porta 3000 (Principal) e conferir: logo nova no login/sidebar, e um print (recibo/termo) mostrando a logo.
- Abrir um formulário (ex.: Nova OS), digitar algo e tentar recarregar a página — deve aparecer o aviso de alterações não salvas.

---

## 📋 Prompt para o Agente (copie e cole no Antigravity)

```text
Você é um engenheiro sênior responsável por validar e promover mudanças entre duas
pastas do sistema MGV One Hub nesta máquina Windows.

## Pastas
- TESTE (origem): D:\HD\MGV\MGV_2026\MGV-Assistencia-Tecnica-TESTE  (porta 3001, banco postgres_teste)
- PRINCIPAL (destino): D:\HD\MGV\MGV_2026\MGV-Assistência-Técnica  (porta 3000, banco postgres) — É O AMBIENTE QUE A EQUIPE USA. IGNORE a pasta "MGV-Assistencia-Tecnica" sem acento (não tem package.json).

## Tarefa
1. VALIDAR a pasta TESTE:
   - Rode `npm run lint`, `npm test` e `npm run build` na pasta TESTE.
   - Confirme que lint passa, os testes passam (44 esperados) e o build conclui sem erros.
   - Se algo falhar, corrija NA PASTA TESTE e só prossiga com tudo verde.

2. COPIAR para a PRINCIPAL somente estes arquivos de código/estáticos (NUNCA .env, node_modules, dist, .freebuff, Dados.MDB, bancos nem o iniciar_mgv_teste.bat):
   - src/components/AppLogo.tsx  (novo)
   - public/logos/LOGO V3.0 (3).webp  (novo)
   - src/utils/unsavedChanges.ts  (novo)
   - src/utils/unsavedChanges.spec.ts  (novo)
   - src/hooks/useUnsavedChangesGuard.ts  (novo)
   - docs/formularios_e_guarda_alteracoes.md  (novo)
   - src/App.tsx
   - src/components/OSList.tsx
   - src/components/OSManager.tsx
   - src/components/LoginForm.tsx
   - src/components/Navbar.tsx
   - src/components/ClientManager.tsx
   - src/components/KanbanBoard.tsx
   - src/components/StockManager.tsx
   - src/components/DashboardView.tsx
   - src/components/FiscalPanel.tsx
   - src/components/OSWhatsAppPanel.tsx
   - src/components/ProfileSettings.tsx
   - src/components/UserManagement.tsx
   - src/components/FeatureFlagsPanel.tsx
   - src/components/GenericSettingsPanel.tsx
   - src/components/BlingSandbox.tsx
   - src/components/SystemConfigPanel.tsx
   - src/controllers/clients.controller.ts
   - (O .env da PRINCIPAL NÃO pode mudar; confirme que ficou intacto após a cópia.)

3. VALIDAR a PRINCIPAL:
   - Rode `npm run lint`, `npm test` e `npm run build` na pasta PRINCIPAL.
   - Confirme que `public/logos/LOGO V3.0 (3).webp` existe nas duas pastas.

4. REINICIAR o servidor da PRINCIPAL (porta 3000):
   - Identifique o processo node escutando na porta 3000 e encerre-o.
   - Suba novamente com o mesmo comando usado (ex.: npm run dev com PORT=3000), aguarde a porta responder.

5. RELATAR:
   - Resultado de cada validação (lint/tests/build nas duas pastas).
   - Lista de arquivos copiados e confirmação de que .env não foi tocado.
   - Confirmação de que a porta 3000 responde após o restart.
   - Qualquer divergência encontrada entre as pastas (ex.: arquivos que existem só na Teste).
```

---

## 🔍 Checklist final para o usuário

- [ ] Lint OK na Teste e na Principal
- [ ] 44 testes passando na Teste e na Principal
- [ ] Build OK na Teste e na Principal
- [ ] `public/logos/LOGO V3.0 (3).webp` presente nas duas pastas
- [ ] `.env` da Principal inalterado (banco `postgres`)
- [ ] Porta 3000 respondendo após restart
- [ ] Logo nova visível no login/sidebar/prints
- [ ] Aviso de alterações não salvas ativo nos formulários
