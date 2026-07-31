# Regras do Projeto (MGV Assistência Técnica)

## Protocolo de Engenharia de Prompt e Otimização de Janela de Contexto

Para maximizar a eficiência e minimizar o consumo de tokens:

1. **Respostas Diretas e Didáticas (em Português do Brasil)**:
   - Eliminar saudações, introduções prolixas e premissas repetitivas.
   - Ir direto ao ponto técnico ou código solicitado.
   - Manter explicação clara e didática.

2. **Contexto Modular e Minimalista**:
   - Enviar apenas trechos de arquivos estritamente necessários ou diffs.
   - Evitar re-enviar histórico redundante ou arquivos inteiros quando modificações pontuais forem suficientes.

3. **Comandos e Códigos Acionáveis**:
   - Entregar código limpo e comandos de terminal prontos para execução.

4. **Memória de Longo Prazo**:
   - Manter decisões de arquitetura e progresso no `walkthrough.md`, `README.md` ou neste arquivo de regras (`AGENTS.md`).

## 🎓 Diretrizes de Apoio a Desenvolvedores Iniciantes

1. **Simplicidade de Código**:
   - Evitar criar abstrações excessivas, padrões de design complexos ou "over-engineering".
   - Priorizar código limpo, legível e de fácil manutenção por iniciantes.

2. **Comentários Didáticos**:
   - Sempre documentar blocos de lógica complexa com comentários curtos e didáticos diretamente no código (em português).

3. **Explicação de Impacto**:
   - Após propor ou realizar uma mudança de código, explicar sucintamente o que foi alterado e como testar/verificar o resultado.

