---
description: Auditoria contínua de segurança de dados, isolamento multi-tenant (RLS) e conformidade LGPD
---

# 🛡️ Workflow: Auditoria de Segurança de Dados, RLS & LGPD

Este workflow orienta a verificação sistemática de código e banco de dados para prevenir vazamentos de dados sensíveis (PII), garantir o isolamento estrito entre empresas (Multi-tenancy) e blindar credenciais.

## 🎯 Objetivos de Proteção
1. **Zero Vazamento de PII**: Evitar exposição de CPF, CNPJ, telefones, e-mails e cartões em logs e interfaces abertas.
2. **Isolamento de Tenant (RLS)**: Assegurar que nenhum usuário acerte dados de outra empresa (`company_id`).
3. **Proteção de Chaves e Tokens**: Garantir que chaves mestre (como `SERVICE_ROLE_KEY` e tokens de API) nunca cheguem ao bundle web ou ao Git.

---

## 📋 Checklist de Verificação por Camada

### 1. Camada de Banco de Dados (Supabase & RLS)
- [ ] **RLS Habilitado**: Todas as tabelas têm `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
- [ ] **Políticas por Tenant**: As políticas aplicam checagem de `company_id`:
  ```sql
  -- Exemplo de política correta
  CREATE POLICY "Isolamento por empresa" ON ordens_servico
    FOR ALL
    USING (company_id = auth.jwt() ->> 'company_id');
  ```
- [ ] **Zero Acesso Anônimo**: Tabelas com dados de clientes não possuem permissão pública (`anon`) sem token de autenticação válido.

### 2. Camada Frontend & Cliente
- [ ] **Filtro Explícito**: Todas as chamadas `supabase.from('...')` contêm `.eq('company_id', currentCompanyId)`.
- [ ] **Sem Chaves Mestras**: Nenhuma referência a `service_role` em arquivos `.tsx`, `.ts` ou `.env.local` distribuído.
- [ ] **Sanitização de Logs**: Nenhum `console.log` imprime objetos brutos de cliente (`console.log(cliente)` ou `console.log(dadosNota)`).

### 3. Integrações Externas (Bling, WhatsApp, etc.)
- [ ] **Tokens Criptografados**: Credenciais e tokens OAuth residem no `Supabase Vault` ou em tabela criptografada com RLS restrito a Edge Functions.
- [ ] **Tratamento de Payload**: Payloads enviados para APIs externas trafegam apenas com campos estritamente necessários.

---

## 🔍 Comandos de Varredura Rápida

Para auditar o código antes de qualquer deploy:

```powershell
# 1. Procurar possíveis logs com dados sensíveis
grep_search -Query "console.log.*(cliente|payload|cpf|cnpj|token|secret|password)"

# 2. Verificar se há service_role no Frontend
grep_search -Query "service_role"

# 3. Conferir se arquivos de ambiente estão protegidos
git status --ignored
```

---

## 🚨 Ações em Caso de Não Conformidade
- Se encontrar chave exposta: revogar imediatamente e rotacionar no painel do provedor.
- Se encontrar query sem `company_id`: bloquear a release até adicionar a cláusula de tenant e validar a RLS correspondente.
- Se encontrar log de PII: substituir por log estruturado e anônimo (ex: `console.info('Processando OS:', osId)`).
