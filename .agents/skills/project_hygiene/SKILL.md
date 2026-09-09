---
name: project_hygiene
description: Governança, auditoria e manutenção da estrutura de diretórios e arquivos do projeto MGV Assistência Técnica. Garante a limpeza da raiz, organização de planilhas, scripts de teste e backups seguros.
---

# Project Hygiene & Workspace Governance

Esta skill orienta agentes e desenvolvedores sobre como manter a estrutura do projeto MGV limpa, organizada e segura.

## 🎯 Princípios Fundamentais

1. **Raiz Blindada:**
   - Apenas arquivos de configuração essenciais (`package.json`, `tsconfig.json`, `vite.config.ts`, `server.ts`, `build.cjs`, `.env.example`, `.gitignore`, `README.md`, Docker/Render) podem residir na raiz.
   - Proibido criar scripts soltos de teste (`test-*.ts`, `check_*.ts`), planilhas (`.xlsx`) ou dumps SQL (`.sql`) na raiz.

2. **Mapa de Alocação de Arquivos**:

| Tipo de Arquivo | Destino Obrigatório |
| :--- | :--- |
| Planilhas, relatórios CSV/XLSX | `planilhas_excel/` |
| Dumps de banco e backups | `backups_seguros/` |
| Guias, manuais e documentações | `docs/guias/` ou `docs/relatorios/` |
| Esquemas e docs de banco | `docs/database/` |
| Scripts de teste pontual | `scripts/tests/` |
| Utilitários e helpers | `scripts/utils/` |
| Scripts legados de auditoria/PDFs | `scripts/archive/` |
| Código de Produção | `src/` (`components/`, `services/`, `routes/`, etc.) |

## 🛠️ Checklist de Auditoria Estrutural

Execute periodicamente para garantir conformidade:
1. Verificar se há arquivos `.xlsx`, `.csv` ou `.sql` soltos na raiz e movê-los para `planilhas_excel/` ou `backups_seguros/`.
2. Verificar se há scripts `test-*.ts` ou `check_*.ts` na raiz e movê-los para `scripts/tests/`.
3. Garantir que o `.gitignore` mantém protegidas as pastas `backups_seguros/`, `planilhas_excel/`, `*.sql` e `.env`.
