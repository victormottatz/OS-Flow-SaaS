---
name: wp_theme_builder
description: Guia e padrão para criar ou modificar seções e componentes no tema WordPress mgv-tema da MGV Assistência Técnica.
---

# Habilidade: WP Theme Builder (MGV Theme)

Esta habilidade fornece instruções passo a passo para criar, estender e refatorar seções e componentes no tema WordPress `mgv-tema`.

## Quando usar esta habilidade
Use esta habilidade quando o usuário solicitar:
- Criar uma nova seção para o site One-Page (ex: `section-faq.php`, `section-pricing.php`).
- Modificar componentes existentes dentro de `mgv-tema/template-parts/`.
- Adicionar novos scripts ou estilos ao arquivo `functions.php` / `inc/enqueue.php`.

---

## Estrutura do Tema `mgv-tema`

```
mgv-tema/
├── style.css                      <-- Estilos e cabeçalho do tema WP
├── functions.php                  <-- Setup do tema, menus e widgets
├── header.php                     <-- Topo, navegação e abertura do <main>
├── footer.php                     <-- Rodapé principal e wp_footer()
├── front-page.php                 <-- Template da página inicial (One-Page)
├── inc/
│   └── enqueue.php                <-- Carregamento de CSS/JS
└── template-parts/
    ├── section-hero.php           <-- Seção Banner principal
    ├── section-services.php       <-- Seção Serviços prestados
    ├── section-differentiators.php<-- Seção Diferenciais MGV
    ├── section-about.php          <-- Seção Sobre Nós
    ├── section-portfolio.php      <-- Seção Marcas & Galeria
    ├── section-testimonials.php   <-- Seção Depoimentos
    └── section-contact.php        <-- Seção Orçamento / Contato
```

---

## Passo a Passo para Criar uma Nova Seção

1. **Criar o arquivo da seção:**
   Crie o arquivo em `mgv-tema/template-parts/section-[nome-da-secao].php`.

2. **Estrutura base do arquivo PHP:**
   ```php
   <?php
   /**
    * Template Part: Seção [Nome da Seção]
    *
    * @package MGV_Theme
    * @since   1.0.0
    */

   if ( ! defined( 'ABSPATH' ) ) {
       exit;
   }
   ?>
   <section id="[nome-da-secao]" class="[nome-da-secao]-section py-16">
       <div class="container mx-auto px-4">
           <h2 class="text-3xl font-bold mb-4"><?php esc_html_e( 'Título da Seção', 'mgv-theme' ); ?></h2>
           <p><?php esc_html_e( 'Descrição da seção.', 'mgv-theme' ); ?></p>
       </div>
   </section>
   ```

3. **Registrar a seção em `front-page.php`:**
   No arquivo `mgv-tema/front-page.php`, inclua a chamada:
   ```php
   <?php get_template_part( 'template-parts/section', '[nome-da-secao]' ); ?>
   ```

4. **Verificação de Segurança:**
   - Todas as saídas de variáveis devem utilizar `esc_html()`, `esc_url()` ou `esc_attr()`.
   - Todas as strings de texto visíveis devem utilizar `'mgv-theme'` como text-domain.
