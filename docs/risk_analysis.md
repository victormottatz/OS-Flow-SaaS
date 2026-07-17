# Análise de Riscos da Implementação (Arquitetura e Banco de Dados)

Este documento mapeia os principais riscos técnicos e operacionais associados à mudança do modelo de dados simples atual para o modelo relacional de alta governança (Base Instalada, Estoque Serializado e Rentabilidade). 

Para cada risco identificado, estabelecemos o grau de impacto, a probabilidade de ocorrência e o plano de mitigação a ser adotado pela equipe técnica da MGV.

---

## 1. Riscos Técnicos e de Infraestrutura

### 1.1. Concorrência e Gargalo no Arquivo JSON
* **Descrição:** Atualmente, a aplicação utiliza um arquivo `database.json` em disco gerenciado por um Mutex Lock (`DatabaseLock`). Com o aumento da complexidade relacional (vincular Peça -> Estoque -> OS -> Base Instalada -> Cliente), operações de gravação ficarão mais densas.
* **Impacto:** Alto (Lentidão geral no sistema, timeouts na requisição).
* **Probabilidade:** Média-Alta (em cenários de múltiplos técnicos fechando OS ao mesmo tempo).
* **Plano de Mitigação:** 
  - A curto prazo: Otimizar o serviço de leitura/escrita com cache em memória (Redis ou variáveis globais robustas).
  - **A longo prazo (Mandatório):** Efetivar a migração definitiva para o **Prisma Client com banco de dados PostgreSQL**, abandonando o arquivo JSON em produção.

### 1.2. Corrupção de Dados na Migração do Legado (Base Instalada)
* **Descrição:** Inconsistências ao transformar o array simples de `devices` para a entidade autônoma de `Base Instalada`, deixando OSs antigas órfãs.
* **Impacto:** Alto (Perda de histórico de garantia).
* **Probabilidade:** Baixa (com scripts validados).
* **Plano de Mitigação:** Criação de scripts de migração (*seeders*) rigorosos que façam backup estrito antes de qualquer modificação, gerando chaves estrangeiras seguras e preenchendo as chaves nulas com valores padrão (ex: `MIGRA-001`).

---

## 2. Riscos Operacionais e de Negócio

### 2.1. Atrito e Queda de Produtividade (Fricção do Técnico)
* **Descrição:** Com as novas regras de "Rastreabilidade Obrigatória" e bloqueios no Kanban, técnicos que estão acostumados a um fluxo livre podem se frustrar ao não conseguirem fechar uma OS por não terem anotado o número de série de uma peça de garantia.
* **Impacto:** Médio.
* **Probabilidade:** Alta (comum em mudanças de ERP).
* **Plano de Mitigação:** 
  - Treinamento adequado pré-lançamento.
  - Implementar mensagens de erro/alerta visuais muito claras ("Falta o nº de série da Peça X").
  - Criar um perfil *Admin/Master* que consiga dar "bypass" (substituir a regra) em situações críticas para não parar a loja.

### 2.2. Precificação Retroativa e "Falso Lucro"
* **Descrição:** Como os custos das peças flutuam e a entrada via Nota Fiscal será feita numa etapa futura, no começo os estoques poderão ter `preco_custo = 0` ou valores desatualizados, fazendo com que a rentabilidade da OS seja calculada erroneamente.
* **Impacto:** Baixo (apenas ruído informacional inicial).
* **Probabilidade:** Alta.
* **Plano de Mitigação:** O modal de Rentabilidade deve ter uma flag/aviso indicando se alguma peça da OS está com "Custo Zero ou Desatualizado", para que o gestor saiba que aquele cálculo de lucro é apenas uma estimativa incompleta.

---

## Conclusão e Parecer Arquitetural

A implementação do novo modelo é altamente viável e o Retorno sobre o Investimento (ROI) no longo prazo, em termos de controle antifraude e governança, compensa os riscos. 

A mitigação crítica central será garantir que a regra do **Lazy Loading (Onboarding Progressivo)** seja fluida para não paralisar o pátio, e preparar o terreno tecnológico para abandonar o armazenamento via JSON o quanto antes.
