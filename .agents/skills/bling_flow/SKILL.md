---
name: bling_flow
description: >-
  Documentação e fluxo de integração com o Bling (V3) para emissão de NF-e, NFC-e, NFS-e e pedidos de venda.
  Descreve as regras de negócio, payloads e tratamento de erros do ERP.
---

# Integração Bling (V3) - MGV Assistência Técnica

Esta skill documenta o fluxo de integração do MGV Assistência Técnica com o ERP Bling V3, que ocorre principalmente no encerramento de Ordens de Serviço (OS).

## 1. Arquitetura da Integração
- **Arquivo Principal:** `src/services/osToBling.ts`
- **Helper de Conexão:** `src/services/bling.ts`
- **Validação Fiscal:** `src/services/nfeService.ts`
- **Endpoint Disparador:** `PUT /api/ordens-servico/:id/status` (no `os.controller.ts`) quando o status muda para `FINALIZADO`.

## 2. Fluxo de Faturamento
O faturamento é separado em duas esteiras principais devido à diferença tributária entre peças e serviços:

### 2.1. Faturamento de Produtos / Peças (NF-e / NFC-e)
Quando há itens consumidos (`usedParts` onde `isAvulso` é falso):
1. **Sincronização de Cliente:** O cliente é sincronizado (`PUT/POST /contatos`).
2. **Sincronização de Peças:** As peças são sincronizadas para garantir que o código do produto e NCM/CFOP existam no Bling (`POST /produtos`).
3. **Pedido de Venda:** É gerado um Pedido de Venda (`POST /pedidos/vendas`) contendo as peças.
4. **Geração de NF:**
   - Se `invoiceType === 'nfe'`: É gerada uma NF-e (`POST /nfe`) apontando para o Pedido de Venda.
   - Se `invoiceType === 'nfce'`: É gerada uma NFC-e (`POST /pedidos/vendas/{id}/gerar-nfce`).

### 2.2. Faturamento de Serviços (NFS-e)
Quando há itens avulsos (mão de obra, calibragem, serviços diversos):
1. **Pedido de Venda (Serviços):** Um pedido de venda separado é criado com os serviços.
2. **Geração de NFS-e:** É enviada uma requisição para a prefeitura via Bling (`POST /nfse`) baseada no Pedido de Venda.
3. A nota de serviço pode ter processamento assíncrono (Retorno 202) por depender da Sefaz/Prefeitura.

## 3. Parametrização do Fechamento
No `KanbanBoard.tsx`, ao arrastar o card para `FINALIZADO`, o modal de Checkout Financeiro exige:
- `paymentMethod`: Método principal de pagamento.
- `paymentDetails`: Array caso o pagamento seja particionado (Múltiplo).
- `paymentDate`: Data do pagamento, que é repassada para as observações do pedido no Bling.
- `paymentNotes`: Observações adicionais, repassadas para o pedido no Bling.
- `syncClientWithErp`: Checkbox que, se desmarcado, pula a etapa de atualização do cliente no Bling (`PUT /contatos/:id`), poupando requisições e evitando sobrescritas desnecessárias se os dados não mudaram.

## 4. Garantia
OS marcadas como "Em Garantia" **não enviam requisições ao Bling**. O sistema as marca internamente com `billingStatus = "DISPENSADO"` e encerra sem cobrança.

## 5. Tratamento de Erros Comuns
- **Erro 36 (Pedido Existente):** O sistema intercepta o erro de "Número de Pedido já cadastrado" e realiza um `GET` para reaproveitar o ID do pedido existente.
- **Erro 9 (CNPJ Inválido):** Falha comum de cadastro. O erro é devolvido com mensagem amigável para o usuário corrigir no módulo de clientes.
