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

## Configuração de Rede Local (Intranet)

Para permitir que outros computadores da sua rede local acessem este sistema (útil para migrações e uso interno):

1. **Liberar a Porta no Firewall do Windows (Servidor):**
   Execute o seguinte comando no **PowerShell como Administrador** na máquina servidora para liberar o tráfego de entrada na porta 3000:
   ```powershell
   New-NetFirewallRule -DisplayName "MGV Sistema - Porta 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
   ```

2. **Descobrir o IP do Servidor:**
   No prompt de comando do servidor, digite `ipconfig` e localize o **Endereço IPv4** (ex: `192.168.1.100`)

3. **Acesso nos Clientes:**
   Em qualquer outro dispositivo na mesma rede local, acesse no navegador:
   `http://[IP-DO-SERVIDOR]:3000` (ex: `http://192.168.1.100:3000`).

4. **Execução Automática e Oculta (Background):**
   Para inicializar o servidor em segundo plano de forma totalmente invisível (sem janela preta do prompt) ao ligar o computador:
   * Pressione `Win + R`, digite `shell:startup` e clique em OK.
   * Crie um **Atalho** para o arquivo `iniciar_oculto.vbs` (localizado na raiz do projeto) e cole dentro dessa pasta de inicialização.
   * O sistema rodará em background a partir do próximo boot!

5. **Protocolo de Garantia e Teste de Estresse:**
   * O sistema exige um teste de estresse físico de 30 minutos em bancada antes de finalizar a OS.
   * Para fins de teste rápido ou desenvolvimento, adicione `ALLOW_SHORT_STRESS_TEST=true` no `.env` do servidor. Isso reduzirá o tempo mínimo do teste de estresse para **10 segundos**.

6. **Fluxo Bling OAuth Híbrido:**
   * Devido à rede local descentralizada, o callback do Bling retorna para a URL de produção na nuvem (Render), que salva os tokens atualizados na tabela `BlingConfig` do Supabase. O servidor Express local lê e renova esses tokens em background de forma transparente, sem requerer logins locais adicionais.

## Deploying to Render

Este repositório está perfeitamente configurado para deploy contínuo usando a infraestrutura do **Render**.

### Como configurar o GitHub no Render
1. Acesse o [Render Dashboard](https://dashboard.render.com/).
2. Clique em **New +** e selecione **Blueprint**.
3. Conecte a sua conta do GitHub e selecione o seu repositório.
4. O Render detectará automaticamente o arquivo `render.yaml` na raiz do projeto.
5. Siga as instruções na tela. O Blueprint solicitará que você defina os valores reais das variáveis de ambiente críticas para o funcionamento (que jamais devem ir para o GitHub).
6. Clique em **Apply** para finalizar. O Render criará o Web Service e começará o deploy em instantes!
