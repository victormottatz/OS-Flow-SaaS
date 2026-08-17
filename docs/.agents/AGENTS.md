# Regras do Projeto: site-MGV

Este documento define as regras, metodologia e diretrizes de desenvolvimento para o repositório **site-MGV** (MGV Assistência Técnica em Equipamentos Estéticos). Todas as alterações no código devem seguir rigorosamente estas especificações.

---

## 1. Metodologia de Desenvolvimento (Spec-Driven & ANWS)

1. **Abordagem Orientada a Especificação:**
   - Antes de iniciar alterações complexas ou novas seções, o escopo, arquitetura e plano de verificação devem ser estabelecidos.
   - Fluxo de trabalho: `Especificação -> Arquitetura -> Tarefas & Verificação -> Execução de Código -> Validação -> Code Review`.

2. **Garantia de Evidência e Validação:**
   - Nenhuma tarefa deve ser declarada como "concluída" sem validação empírica (testes visuais no navegador via `live-server` ou verificação da sintaxe PHP).

---

## 2. Padrões de Código WordPress (`mgv-tema`)

1. **Segurança e Sanitização:**
   - Sempre utilize funções de escape de saída apropriadas ao renderizar variáveis no HTML:
     - `esc_html()` para texto simples.
     - `esc_url()` para URLs e atributos de links.
     - `esc_attr()` para atributos HTML (como `alt`, `title`, `class`).
     - `wp_kses_post()` para fragmentos de HTML permitidos.
   - Proteja todos os arquivos PHP do tema contra acesso direto com a verificação:
     ```php
     if ( ! defined( 'ABSPATH' ) ) {
         exit;
     }
     ```

2. **Modularização de Páginas:**
   - Mantenha as seções da página One-Page separadas no diretório `template-parts/`.
   - Carregue seções usando a função nativa do WordPress `get_template_part( 'template-parts/section', 'NOME_DA_SECAO' );`.

3. **Internacionalização (i18n):**
   - Todas as strings visíveis para o usuário em PHP devem utilizar as funções de tradução com o text-domain `'mgv-theme'`, exemplo: `__( 'Texto aqui', 'mgv-theme' )` ou `esc_html_e( 'Texto aqui', 'mgv-theme' )`.

---

## 3. Design System & Frontend

1. **Estética Visual (Super Round & Mobile-First):**
   - O projeto adota uma identidade visual moderna com cantos arredondados (`rounded-full`, `rounded-xl`, `rounded-lg`).
   - Botões principais e entradas de texto devem utilizar o estilo de pílula (`rounded-full`).
   - A paleta de cores primária utiliza tons de ouro/castanho (`#785900`, `#ffc107`, `#fabd00`) combinados com superfícies limpas e neutras.

2. **Acessibilidade & HTML5 Semântico (WCAG / A11y):**
   - Mantenha tags semânticas `<header>`, `<main>`, `<section>`, `<footer>`, `<nav>` e `<article>`.
   - Todas as imagens devem possuir o atributo `alt` preenchido com descrição clara em Português do Brasil.
   - Botões interativos sem texto visível devem conter `aria-label`.

---

## 4. Otimização de Performance & SEO

1. **Otimização de Carregamento:**
   - Imagens devem utilizar `loading="lazy"` (exceto na Hero Section que deve usar `loading="eager"`).
   - Manter scripts e folhas de estilo organizados de forma não-bloqueante.

2. **SEO Local (MGV Ribeirão Preto):**
   - Garantir tags OpenGraph e meta-tags estruturadas para motores de busca e compartilhamento em redes sociais.
