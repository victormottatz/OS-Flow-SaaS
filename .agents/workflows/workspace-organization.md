# Workflow: Governança e Organização Estrutural do Repositório (Workspace Organization)

Este workflow descreve o procedimento operacional padrão para manter a raiz e os diretórios do projeto **MGV Assistência Técnica** limpos, seguros e com separação lógica estrita.

---

## 📋 Quando Executar Este Workflow

- Ao iniciar ou concluir grandes refatorações ou tarefas de manutenção.
- Após gerar dumps de banco de dados, planilhas de conferência ou relatórios temporários.
- Sempre que identificar arquivos soltos na raiz que não sejam manifestos de configuração.

---

## 🚀 Passo a Passo Operacional

### Etapa 1: Inspeção da Raiz
Verifique se existem arquivos que não pertencem ao grupo de arquivos vitais:
* **Arquivos Vitais Permitidos na Raiz:**
  - `package.json`, `package-lock.json`
  - `tsconfig.json`, `vite.config.ts`
  - `server.ts`, `build.cjs`, `index.html`
  - `.env.example`, `.gitignore`, `README.md`
  - Arquivos de deploy (`docker-compose.yml`, `evolution-docker-compose.yml`, `render.yaml`, `nixpacks.toml`)

### Etapa 2: Realocação Segura
Caso encontre itens fora do padrão:
1. **Planilhas (`.xlsx`, `.xls`, `.csv`):** Mover para `planilhas_excel/`.
2. **Dumps e Snapshots (`.sql`, `.json` de backup):** Mover para `backups_seguros/`.
3. **Scripts de Teste/One-off (`test-*.ts`, `check_*.ts`):** Mover para `scripts/tests/`.
4. **Documentações e Relatórios (`.md` avulsos):** Mover para `docs/guias/` ou `docs/relatorios/`.

### Etapa 3: Validação de Build e Ignored Files
1. Executar verificação de compilação: `npx tsc --noEmit`.
2. Confirmar que o `.gitignore` protege as pastas `planilhas_excel/` e `backups_seguros/`.
