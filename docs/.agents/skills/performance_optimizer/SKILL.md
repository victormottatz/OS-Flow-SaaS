---
name: performance_optimizer
description: Otimização de desempenho web, tempos de carregamento, Web Vitals, imagens e scripts do site MGV.
---

# Habilidade: Performance Optimizer

Esta habilidade orienta a otimização de performance e velocidade de carregamento (LCP, CLS, FID/INP) das páginas do site MGV.

## Quando usar esta habilidade
Use esta habilidade quando:
- O site estiver demorando para carregar imagens ou recursos externos.
- O usuário pedir para otimizar os tempos de carregamento em dispositivos móveis.
- For necessário configurar carregamento diferido (*lazy loading*) e pré-carregamento de fontes e scripts.

---

## Boas Práticas de Otimização

### 1. Otimização de Imagens
- Imagens acima da dobra (Hero Section) devem usar `loading="eager"` e `fetchpriority="high"`.
- Imagens abaixo da dobra devem usar `loading="lazy"`.
- Sempre definir atributos `width` e `height` (ou aspect-ratio via CSS) nas imagens para evitar deslocamento de layout (CLS - Cumulative Layout Shift).

### 2. Recursos Externos & Fontes
- Utilizar `preconnect` para fontes Google e CDN do Tailwind CSS:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ```

### 3. Minificação e Scripts
- Evitar carregamento de scripts bloqueantes no `<head>`.
- Adicionar atributos `defer` ou `async` em scripts secundários.
