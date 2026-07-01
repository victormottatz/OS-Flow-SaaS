# Tasks de Implementação (Nível Enterprise - MGV)

Esta é a lista de acompanhamento para a implementação dos novos módulos do sistema MGV Assistência Técnica, priorizados conforme a matriz ERP.

- `[x]` **Prioridade 1: Módulo Dedicado de Estoque & Serialização** ✅
  - `[x]` Atualizar o esquema do banco de dados (Prisma/JSON) para o modelo estendido de Produtos (`sku`, `estoque_minimo`, `preco_custo`, `exige_serie`).
  - `[x]` Modificar a tabela/modelo de peças inseridas na OS para suportar o campo `numero_serie` (quando exigido).
  - `[x]` Adicionar trava de avanço no Kanban: impedir fechamento da OS se houver peça que `exige_serie` sem série preenchida.
  - `[x]` Criar a nova interface/aba "Estoque" no frontend (Visualização e edição).
- `[ ]` **Prioridade 2: Rentabilidade por OS (Custo vs Lucro)**
  - `[ ]` Gravar snapshot do `preco_custo` atual do produto na hora da alocação na OS.
  - `[ ]` Criar modal gerencial no frontend ("Encerramento de OS") exibindo Margem de Lucro (Apenas perfil OWNER).
- `[ ]` **Prioridade 3: Base Instalada, Grids e Visão 360º (Lazy Loading)**
  - `[ ]` Criar modelo de "Equipamento Base Instalada" atrelado ao cliente.
  - `[ ]` Implementar gatilho de bloqueio (Lazy Loading): exigir atualização do aparelho para Base Instalada ao movimentar OSs legadas.
  - `[ ]` Atualizar a sessão "Clientes" para uma Data Table interativa com filtros dinâmicos (estilo Protheus).
  - `[ ]` Adicionar "Motor de Recorrência": flag vermelha se >2 OS em 90 dias.
- `[ ]` **Prioridade 4: Checklist de Entrada e Laudo Fotográfico**
  - `[ ]` *A definir detalhes da implementação mobile.*
- `[ ]` **Prioridade 5: Portal de Acompanhamento Público**
  - `[ ]` *A definir após estabilização do core.*
