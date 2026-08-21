# Template de Code Review & Release — ANWS Workflow

## 🔍 Checklist de Code Review
- [ ] O código segue as funções de escape do WordPress (`esc_html`, `esc_url`, `esc_attr`)?
- [ ] O arquivo PHP possui a proteção `if ( ! defined( 'ABSPATH' ) ) exit;`?
- [ ] A seção foi testada em resolução mobile e desktop?

## 🚀 Publicação
- [ ] Alterações commitadas no Git.
- [ ] Atualização da documentação no `docs/README.md`.
