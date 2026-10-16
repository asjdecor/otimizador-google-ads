# Equipe Dev IA: 5 agentes + 6 arquivos

## Fluxo
produto → arquiteto → designer → planejador → desenvolvedor (e o planejador fecha cada sessão atualizando a memória)

## Agente x arquivo
| Agente | Dono de |
|---|---|
| 01-produto | docs/prd.md |
| 02-arquiteto | docs/arquitetura.md, docs/regras.md |
| 03-designer | docs/design.md |
| 04-planejador | docs/tarefas.md, docs/memoria.md |
| 05-desenvolvedor | src/, testes/ |

## Estrutura do projeto
```
projeto/
├─ docs/   prd.md, arquitetura.md, regras.md, design.md, tarefas.md, memoria.md
├─ src/    app/, api/, componentes/
└─ testes/
```

## Para usar no Claude Code
Copie os 5 arquivos .md de `agentes/` para `.claude/agentes/` do seu projeto (ou `.claude/agents/`).
