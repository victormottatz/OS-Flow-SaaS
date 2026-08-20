# Relatório — opencode-autolearn

## 1. Resumo executivo
O **opencode-autolearn** é um motor de auto-aprimoramento para o OpenCode. Está **instalado e operacional** na máquina, mas como o store de memória ainda está vazio (nenhuma revisão foi gerada), ele ainda **não aprendeu nada**. Está em estado "limpo", pronto para começar a coletar aprendizado das conversas.

## 2. Status de instalação

| Componente | Local | Status |
|---|---|---|
| Plugin principal | `~/.config/opencode/plugins/autolearn.js` | ✅ Presente |
| Skill `autolearn-reviewer` | `~/.agents/skills/autolearn-reviewer` | ✅ Presente |
| Skill `self-improving-agent` | `~/.agents/skills/self-improving-agent` | ✅ Presente |
| CLI `autolearn.py` | `.../autolearn-reviewer/scripts/autolearn.py` | ✅ Presente |
| CLI `improve.py` | `.../self-improving-agent/scripts/improve.py` | ✅ Presente |
| Config OpenCode | `~/.config/opencode/opencode.jsonc` | ✅ Plugin + agente registrados |
| Store de dados | `~/.autolearn/personas/default/` | ✅ Criado |
| Store de regras | `~/.agent-improvement/rules.yaml` | ✅ Presente (vazio) |

## 3. Configuração ativa (`config.yaml`)
- `review_threshold: 10` — revisa a cada 10 turnos do assistente
- `session_review_on_idle: true` — revisa quando a sessão fica ociosa
- `max_conversation_buffer: 50` — até 50 mensagens em buffer
- `curator_interval_days: 7` — curador semanal
- `stale_after_days: 30` / `archive_after_days: 90` — ciclo de vida de skills
- `escalation_threshold: 3` — promove regra ao `AGENTS.md` após 3 reforços

## 4. Estado do aprendizado (dados coletados)
- **Memória**: `memory.md` está vazia (só cabeçalho) → agente ainda não aprendeu nada
- **Perfil do usuário**: `user-profile.md` vazio
- **Observações** (`observations.jsonl`): **0 eventos registrados**
- **Revisões geradas**: **0**
- **Skills criadas pelo agente**: nenhuma (só a pasta `.archive` padrão)
- **Regras comportamentais**: 0

## 5. Observação técnica
O `opencode.jsonc` aponta `instructions` para **`memory.context.md`** — e o arquivo **existe**. Não há problema. Ambos `memory.md` e `memory.context.md` estão presentes. Nada a corrigir.

## 6. Como usar (comandos úteis)
```bash
# Ver o que já foi aprendido
uv run ~/.agents/skills/autolearn-reviewer/scripts/autolearn.py memory list

# Inserir preferência manualmente
uv run ~/.agents/skills/autolearn-reviewer/scripts/autolearn.py memory add "Prefere respostas em português"
uv run ~/.agents/skills/autolearn-reviewer/scripts/autolearn.py user add "Usa Windows/PowerShell"

# Skills criadas pelo agente
uv run ~/.agents/skills/autolearn-reviewer/scripts/autolearn.py skill list

# Busca em conversas passadas
uv run ~/.agents/skills/autolearn-reviewer/scripts/autolearn.py search init
uv run ~/.agents/skills/autolearn-reviewer/scripts/autolearn.py search query "termo"

# Regras comportamentais → AGENTS.md
uv run ~/.agents/skills/self-improving-agent/scripts/improve.py status
uv run ~/.agents/skills/self-improving-agent/scripts/improve.py escalate --dry-run
```

## 7. Recomendações
1. **Nada instalado está quebrado** — sistema operacional e pronto.
2. Para o sistema começar a aprender, basta **continuar usando e corrigir o agente** quando errar.
3. Opcional: registrar preferências iniciais via `memory add` / `user add`.