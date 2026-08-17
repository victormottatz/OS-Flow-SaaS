# 🛠️ Guia Manual — Edição de CSS e JavaScript Global

> **Objetivo:** ensinar você a alterar o visual e o comportamento global do sistema **sozinho**, editando os arquivos na mão, **sem depender de agente de IA**.
>
> **Nível:** iniciante (passo a passo).
>
> **Última revisão:** após autorização do plano (plan mode → build).

---

## 1️⃣ Como testar suas mudanças

Antes de qualquer edição, aprenda como rodar e ver o resultado:

| Comando | O que faz | Onde ver |
|---|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento | `http://localhost:3000` |
| `npm run build` | Gera a versão de produção (comprova que não há erro) | `dist/` |
| `npm run lint` | Checa erros de TypeScript (`tsc --noEmit`) | terminal |

**Dica:** com `npm run dev` ativo, quase toda mudança em `.css`/`.tsx` aparece **na hora** ao salvar (Hot Reload). Se não aparecer, recarregue a página com `F5` ou `Ctrl + Shift + R` (recarrega ignorando cache).

---

## 2️⃣ Rotina segura antes de editar (sempre)

1. **Faça backup** do arquivo que vai tocar (ex.: copie `src/index.css` → `src/index.css.bak`).
2. **Edite apenas uma coisa por vez** e salve.
3. **Teste no navegador.** Se quebrou, restaure o backup.
4. Só siga para a próxima mudança quando a anterior estiver OK.

---

## 3️⃣ Onde está o "CSS global" deste sistema

Este projeto usa **Tailwind CSS v4** (config-free: **não existe** `tailwind.config.js`). Toda a tematização é feita em **um único arquivo**:

```
src/index.css   ← É AQUI que se muda o tema inteiro
```

### 🎨 Trocar a cor da marca (muda o sistema INTEIRO)

Arquivo: `src/index.css` → bloco `@theme` (linhas 4–34).

```css
--color-primary-container: #111111;      /* cor "primária": fundos escuros, texto em botões amarelos */
--color-secondary-container: #fbbb18;    /* cor "secundária": o AMARELO da marca (botões, destaques) */
--color-secondary-container-hover: #e5aa0d;  /* amarelo ao passar o mouse */
```

**Como trocar:**
- Troque o valor hexadecimal `#fbbb18` por outra cor, ex.: `#22c55e` (verde).
- Salve e recarregue o navegador.
- ⚠️ Esse amarelo é usado em **botões de ação, sidebar e destaques** — mude com cuidado.

### 🔤 Trocar as fontes do sistema

Arquivo: `src/index.css:5-7` + `index.html:11`.

```css
--font-sans: "Lato", system-ui, ...;       /* corpo do texto */
--font-display: "Poppins", sans-serif;     /* títulos (h1-h6) */
--font-mono: "JetBrains Mono", monospace;  /* textos técnicos, códigos, rodapé */
```

- Para trocar por fonte do Google, edite também o `index.html` (o `<link>` que baixa a fonte):
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined..." rel="stylesheet" />
  ```
  Troque o `family=` por sua fonte nova, ex.: `family=Roboto:wght@300;400;700`.

### 🏠 Mudar a cor de fundo global da aplicação

Arquivo: `src/index.css:39`

```css
body { background-color: #f8fafc; }   /* fundo geral das telas */
```

### ✨ Ajustar a sombra dos "cards"

Arquivo: `src/index.css:31-33` — bloco `--shadow-*`. Quanto maior o valor do primeiro número (ex.: `0 20px`), maior a sombra.

---

## 4️⃣ Mudanças de layout e navegação

### 📐 Largura da sidebar (menu lateral esquerdo)

A largura é definida em **3 lugares que precisam andar juntos**:

| Onde | Linha | Valor atual | O que controla |
|---|---|---|---|
| `src/components/Navbar.tsx` | 66 | `w-[70px]` / `w-[260px]` | **Origem**: largura recolhida/expandida |
| `src/components/Navbar.tsx` | 205 | `md:pl-[102px]` / `md:pl-[292px]` | Deslocamento do header (topo) |
| `src/App.tsx` | 239-240 | `md:ml-[70px]` / `md:ml-[260px]` | Margem do conteúdo |
| `src/App.tsx` | 369 | `md:ml-[70px]` / `md:ml-[260px]` | Deslocamento do rodapé |

**Regra prática:** se você aumentar a largura expandida para `w-[300px]`, faça `md:ml-[300px]` (App) e `md:pl-[332px]` (header = 300 + 32 de folga). Deixe a sidebar sempre em múltiplos "redondos" (70, 260) para facilitar.

### 📱 Barra de navegação do celular (bottom bar)

Arquivo: `src/components/Navbar.tsx:257-284`. Aqui ficam os ícones do rodapé fixo no mobile. Para mudar cor dos botões ativos, altere `text-indigo-650 bg-indigo-50` na linha 276.

### 🦶 Rodapé global

Arquivo: `src/App.tsx:368-372`. O ano já é dinâmico (`new Date().getFullYear()`). Para mudar o texto, edite a linha 371.

### ➕ Botão flutuante "Nova OS" (FAB)

Arquivo: `src/App.tsx:359-366`. O botão redondo amarelo no canto inferior direito. Para mover, mude `bottom-8 right-8`.

---

## 5️⃣ Comportamento JavaScript global

O comportamento de **toda a aplicação logada** vive em `src/App.tsx`:

| Seção | Linhas | O que faz |
|---|---|---|
| Roteamento por URL | 25–98 | Converte caminhos (`/clientes`, `/os`) em abas |
| Restaurar sessão | 100–111 | Lê `mgv_user` / `mgv_token` do `localStorage` |
| Login | 188–196 | Salva sessão + configura o Axios |
| Logout | 198–205 | Apaga sessão e o cabeçalho do Axios |
| Offsets do conteúdo | 237–241 | Margem conforme sidebar |

> 🔑 **Chaves do localStorage** usadas: `mgv_user`, `mgv_token`, `mgv_sidebar_minimized`.
> Se um dia quiser "resetar" o sistema, no navegador abra DevTools (`F12`) → Console → `localStorage.clear()` → recarregue.

### 💡 Exemplo pronto — Atalho de teclado global (ex.: `Alt+N` = Nova OS)

Abra `src/App.tsx`, encontre o `useEffect` que começa em `// Sync tab with browser back/forward buttons` (linha 92) e cole **abaixo** dele um novo bloco:

```tsx
// GUIA: Atalho global de teclado — Alt+N abre Nova Ordem de Serviço.
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.altKey && e.key.toLowerCase() === "n") {
      handleTabChange("os-create");
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [handleTabChange]);
```

> ⚠️ `handleTabChange` é redefinida a cada render — se o React avisar sobre dependência, troque `}, [handleTabChange]);` por `}, [currentTab]);`.

### 💡 Exemplo pronto — Título da aba do navegador dinâmico

```tsx
// GUIA: Atualiza o título da aba do navegador conforme a tela atual.
useEffect(() => {
  const titles: Record<string, string> = {
    dashboard: "Painel de Controle",
    clients: "Clientes & Equipamentos",
    os: "Listagem de OS",
    kanban: "Ordens de Serviço",
    estoque: "Gestão de Estoque",
  };
  document.title = titles[currentTab] || "MGV One Hub";
}, [currentTab]);
```

---

## 6️⃣ CSS de impressão (recibos, termos e DANFE)

Arquivo: `src/index.css:80-131`.

- Ao imprimir, o sistema **esconde tudo** menos os elementos com `id="printable-recibo"`, `id="printable-termo"`, `id="printable-danfe"` ou classe `.printable-area`.
- Para **esconder um elemento também na hora de imprimir**, adicione a classe `no-print` nele (a linha 96 já oculta `button` e `nav`).
- Para **mudar margens da impressão**, altere `@page { margin: 8mm; }` na linha 81.

---

## 7️⃣ FAQ / Resolução de problemas

**"Salvei mas nada mudou no navegador"**
→ Recarregue com `Ctrl + Shift + R` (limpa cache). Se ainda não mudou, confirme que está editando o arquivo certo e que o `npm run dev` não parou.

**"O `npm run build` deu erro de cor desconhecida"**
→ Cores usadas no Tailwind precisam existir como token em `@theme` (ex.: `text-secondary-container`). Se usar um nome novo (ex.: `text-minha-cor`), adicione primeiro:
```css
--color-minha-cor: #123456;
```

**"Mudei a largura da sidebar e o conteúdo ficou torto"**
→ Lembra da tabela da seção 4? Você precisa ajustar **os 4 lugares juntos**. Restaure e use a regra prática.

**"Quero desfazer tudo"**
→ Use o `.bak` que criou na rotina segura, ou no git: `git checkout -- <arquivo>`.

---

## 8️⃣ Checklist final de boas práticas

- [ ] Backup feito (`.bak` ou commit)
- [ ] Uma mudança por vez
- [ ] Testado no `npm run dev`
- [ ] `npm run lint` sem erros antes de finalizar
- [ ] `npm run build` OK (se for publicar)
