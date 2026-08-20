# 🔎 Mini Relatório — OS não finaliza após Checklist de Saída

> **Status:** Diagnóstico concluído (correção pendente de aprovação)
> **Data:** 07/08/2026
> **Sistema:** MGV One Hub — Módulo Kanban de Ordens de Serviço

---

## 🎯 Resumo em 1 frase

Quando uma OS está em **"Pago, Pronto p/ Retirada"** e o card é arrastado para **"Finalizado"**, o sistema abre o Checklist de Saída, o checklist **salva normalmente**, mas o card **nunca é movido** para Finalizado — a OS fica "presa" na coluna.

---

## 🔄 O que DEVERIA acontecer (fluxo esperado)

1. Cliente chega para retirar o aparelho.
2. Atendente arrasta o card de **"Pago, Pronto p/ Retirada"** para **"Finalizado"**.
3. O sistema abre o **Checklist de Saída** (conferência de qualidade antes da entrega).
4. Ao salvar o checklist → a OS é movida para **Finalizado** (e dispara o faturamento no Bling/SEFAZ).

## 🐛 O que REALMENTE acontece

| Etapa | Ocorre? |
|---|---|
| Card arrastado para "Finalizado" | ✅ |
| Modal abre na aba **"Checklist de Saída"** | ✅ |
| Checklist preenchido e clicado em **"Salvar Alterações"** | ✅ |
| Checklist é gravado no banco | ✅ *(por isso "os dados salvam normalmente")* |
| **Card é movido para "Finalizado"** | ❌ **NUNCA** |

---

## 🧠 Causa raiz (explicação técnica e didática)

**Arquivo:** `src/components/KanbanBoard.tsx`
**Funções:** `handleDrop` (linha ~1100) e `handleSaveChecklistSaida` (linha 890)

Existe um **"bloqueio de finalização"** no arrastar-e-soltar. Ao soltar o card em Finalizado, o código **aborta a movimentação** e abre o modal:

```js
// Linha 1100 (handleDrop)
if (targetStatus === "FINALIZADO" &&
    (!billingStatus || billingStatus === "PENDENTE" || billingStatus === "REJEITADO")) {
  setSelectedOS(osToMove);
  setModalTab("saida");   // abre a aba do Checklist de Saída
  setShowEditModal(true);
  setDraggingId(null);
  return;                 // ← AQUI: a movimentação é abortada
}
```

A intenção do bloqueio era **"forçar o preenchimento do checklist antes de finalizar"**. O problema é que o fluxo ficou **pela metade**:

- O botão **"Salvar Alterações"** da aba de saída chama `handleSaveChecklistSaida`, que faz:
  `POST /api/ordens-servico/{id}/checklist-saida` → **só grava o checklist**.
- **Nenhuma função retoma a finalização** depois disso. O `PUT /status` (que moveria para FINALIZADO) **nunca é chamado**.

### Por que afeta justamente as OS "Pago, Pronto p/ Retirada"?

Porque o campo `billingStatus` dessas OS é **`PENDENTE`**. O faturamento no Bling/SEFAZ só é disparado **no momento da finalização** — ou seja, uma OS paga (financeiro) ainda tem `billingStatus = PENDENTE` (fiscal). A condição do bloqueio trata `PENDENTE` como "não pode finalizar ainda", atingindo exatamente essas OS.

---

## ⚠️ Impacto

- Atendente fica **preso**: o checklist salva, mas o card nunca vai para Finalizado.
- O **faturamento no Bling/SEFAZ** (que só dispara na transição para FINALIZADO) **nunca acontece** por esse caminho.
- Equipamento já entregue continua aparecendo como "aguardando retirada" no Kanban.

---

## 🛠️ Correção sugerida

### Opção A — Recomendada (fluxo completo)
Guardar o "destino pendente" quando o bloqueio disparar e, ao salvar o checklist de saída, **continuar a transição** chamando o endpoint de status (`PUT /status` → FINALIZADO), reutilizando a lógica existente (validação fiscal, faturamento Bling, etc.).

### Opção B — Alternativa (mínima)
Restringir o bloqueio para ocorrer **apenas quando o checklist de saída ainda não foi preenchido** (ex.: ignorar o bloqueio se `checklistSaida` já tiver itens salvos). Menor mudança, mas mantém o furo do fluxo para quem precisar editar e finalizar na mesma ação.

---

## 🧪 Como reproduzir (para a equipe testar)

1. Abra o **Kanban Técnico**.
2. Localize uma OS na coluna **"Pago Pronto p/ Retirada"**.
3. **Arraste o card** para a coluna **"Finalizado"**.
4. O modal abre na aba **"4. Checklist de Saída"**.
5. Clique em **"Editar Checklist"**, marque os itens e clique em **"Salvar Alterações"**.
6. Feche o modal → **o card continua em "Pago Pronto p/ Retirada"** ❌

---

## 📁 Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `src/components/KanbanBoard.tsx` | Drag & drop + modal de edição (abre a aba de saída e aborta a movimentação) |
| `src/controllers/os.controller.ts` | Backend: endpoints `checklist-saida` (só grava) e `status` (movimenta) |
| `src/routes/os.routes.ts` | Rotas `POST /:id/checklist-saida` e `PUT /:id/status` |
