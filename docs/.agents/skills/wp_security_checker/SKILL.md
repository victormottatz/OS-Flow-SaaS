---
name: wp_security_checker
description: Auditoria de segurança, higienização de inputs/outputs, proteção contra XSS, CSRF e validação de código PHP no tema mgv-tema.
---

# Habilidade: WordPress Security Checker

Esta habilidade orienta o processo de sanitização, escape e proteção de segurança nos arquivos PHP do tema `mgv-tema`.

## Quando usar esta habilidade
Use esta habilidade quando:
- For criado ou editado qualquer arquivo `.php` no tema WordPress.
- For adicionado um novo formulário de contato, formulário de busca de OS ou requisição AJAX/POST.
- O usuário solicitar uma auditoria de segurança no código PHP.

---

## Regras de Segurança Indispensáveis

### 1. Prevenção de Acesso Direto aos Arquivos
Todo arquivo PHP do tema deve conter no topo:
```php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Impede acesso direto ao arquivo.
}
```

### 2. Sanitização de Saída (Escaping)
Nunca imprima variáveis brutas no HTML. Utilize sempre a função correta:

| Tipo de Dado | Função de Escape | Exemplo de Uso |
|---|---|---|
| Texto simples | `esc_html()` | `echo esc_html( $titulo );` |
| URLs e Links | `esc_url()` | `<a href="<?php echo esc_url( $link ); ?>">` |
| Atributos HTML | `esc_attr()` | `<input value="<?php echo esc_attr( $valor ); ?>">` |
| HTML Permitido | `wp_kses_post()` | `echo wp_kses_post( $conteudo_formatado );` |

### 3. Proteção de Formulários e Nonces (CSRF)
Ao criar formulários customizados ou endpoints AJAX no WordPress:
- Gerar nonce: `wp_nonce_field( 'mgv_form_action', 'mgv_nonce_field' );`
- Verificar nonce no backend: `check_admin_referer( 'mgv_form_action', 'mgv_nonce_field' );`
