# MGV Sistema Integrado

Sistema proprietário de gestão e automação fiscal para assistência técnica MGV.
Sistema de gestão focado em assistência técnica. Conta com um painel Kanban para gerenciamento de fluxo de Ordens de Serviço (O.S.) e integração direta com o ERP Bling V3 para faturamento automático e emissão de notas fiscais (SEFAZ).

## Como rodar localmente

**Pré-requisitos:** Node.js (v18+)

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente:
   Crie uma cópia do arquivo `.env.example` e renomeie para `.env`. Em seguida, preencha as variáveis com suas credenciais (por exemplo, chaves do Bling).

3. Inicie o servidor:
   ```bash
   npm run dev
   ```

A aplicação estará disponível em `http://localhost:3000`.

## Deploying to Render

Este repositório está perfeitamente configurado para deploy contínuo usando a infraestrutura do **Render**.

### Como configurar o GitHub no Render
1. Acesse o [Render Dashboard](https://dashboard.render.com/).
2. Clique em **New +** e selecione **Blueprint**.
3. Conecte a sua conta do GitHub e selecione o seu repositório.
4. O Render detectará automaticamente o arquivo `render.yaml` na raiz do projeto.
5. Siga as instruções na tela. O Blueprint solicitará que você defina os valores reais das variáveis de ambiente críticas para o funcionamento (que jamais devem ir para o GitHub).
6. Clique em **Apply** para finalizar. O Render criará o Web Service e começará o deploy em instantes!
