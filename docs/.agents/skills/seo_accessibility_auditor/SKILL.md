---
name: seo_accessibility_auditor
description: Auditoria e otimização de SEO local (Ribeirão Preto), meta-tags, dados estruturados (Schema.org) e Acessibilidade (WCAG/A11y) no site MGV.
---

# Habilidade: SEO & Accessibility Auditor

Esta habilidade orienta a auditoria e correção de SEO (Search Engine Optimization) e Acessibilidade Web (A11y) nas páginas do site MGV.

## Quando usar esta habilidade
Use esta habilidade quando:
- For necessário auditar meta-tags, títulos ou descrições da landing page ou do tema WordPress.
- For preciso validar a acessibilidade das imagens (`alt`), botões (`aria-label`) e contraste de cores.
- For solicitado adicionar dados estruturados (Schema.org) para assistência técnica local em Ribeirão Preto.

---

## Diretrizes de SEO Local (MGV Ribeirão Preto)

1. **Meta Description & Título:**
   - O título principal deve conter a palavra-chave primária (ex: `MGV Tecnologia & Assistência Técnica | Equipamentos Estéticos`).
   - A meta description deve enfatizar o rápido atendimento (24h a 48h), localização (Ribeirão Preto) e chamada para ação no WhatsApp.

2. **Hierarquia de Cabeçalhos (Heading Tags):**
   - Garantir **apenas um `<h1>`** por página.
   - Manter a sequência lógica (`<h1>` -> `<h2>` -> `<h3>`) sem pular níveis de cabeçalho.

3. **Dados Estruturados (JSON-LD LocalBusiness):**
   ```html
   <script type="application/ld+json">
   {
     "@context": "https://schema.org",
     "@type": "LocalBusiness",
     "name": "MGV Assistência Técnica",
     "image": "https://mgv.com.br/wp-content/uploads/logo.png",
     "telephone": "+5516991049631",
     "address": {
       "@type": "PostalAddress",
       "streetAddress": "Rua Julio Preste, 648 - Jd Sumaré",
       "addressLocality": "Ribeirão Preto",
       "addressRegion": "SP",
       "addressCountry": "BR"
     }
   }
   </script>
   ```

---

## Diretrizes de Acessibilidade (WCAG 2.1)

1. **Imagens:**
   - Toda tag `<img>` deve possuir `alt="..."` descritivo em Português do Brasil.
2. **Navegação por Teclado & Foco Visual:**
   - Botões e links devem ter estados de foco visíveis (`focus:outline-none focus:ring-2`).
3. **Leitores de Tela:**
   - Botões contendo apenas ícones SVG devem incluir `aria-label="Descrição da Ação"`.
