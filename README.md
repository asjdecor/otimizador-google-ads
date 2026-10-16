# Otimizador de Anúncios Google Ads

App pessoal que se conecta à sua conta do Google Ads (somente leitura), mostra onde a verba está sendo desperdiçada, dá nota de 0 a 100 a cada anúncio e (em breve) gera títulos e descrições melhores com IA (Claude).

> **Status:** em desenvolvimento. Fases 1–4 prontas (base, conexão, painel de métricas, nota e diagnóstico). Veja [docs/tarefas.md](docs/tarefas.md).
> **Segurança:** o app ainda **não tem login próprio** e foi feito para rodar em `localhost`. Não publique online antes da fase de publicação (login + banco online).

## O que ele faz

- **Painel:** custo, cliques, CTR, CPC, conversões; palavras-chave que gastam sem converter; anúncios com CTR abaixo da média do grupo.
- **Anúncios:** nota 0–100 por regras explicadas (limite de caracteres, palavra-chave no título, chamada para ação, títulos repetidos, quantidade de variações, força do anúncio) com "como corrigir".
- **Nada é alterado no Google Ads** — o app só lê e sugere.

## Como rodar

Requisitos: Node 24+.

```bash
npm install
cp .env.example .env          # preencha as chaves (veja os comentários no arquivo)
npx prisma migrate deploy      # cria o banco SQLite local
npm run dev                    # http://localhost:3000
```

Chaves necessárias no `.env`:

| Variável | Onde conseguir |
|---|---|
| `ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud → APIs e serviços → Credenciais (OAuth, app da Web). Redirect: `http://localhost:3000/api/auth/google/callback` |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads (conta MCC) → Ferramentas → Central de API. Peça acesso **Básico** para ler contas reais |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (Fase 5) |

## Comandos

| Comando | O que faz |
|---|---|
| `npm test` | Testes (Vitest) — usam banco isolado e Google/Claude falsos, sem custo |
| `npm run typecheck` | TypeScript estrito |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção |

## Stack

Next.js 15 · React 19 · TypeScript (estrito) · Tailwind 4 · Prisma 6 + SQLite · Google Ads API (`google-ads-api`) · Anthropic SDK · Vitest.

## Como o projeto é feito

O projeto é construído por uma "equipe" de agentes de IA, cada um dono de um documento:

| Agente | Documento |
|---|---|
| produto | [docs/prd.md](docs/prd.md) |
| arquiteto | [docs/arquitetura.md](docs/arquitetura.md), [docs/regras.md](docs/regras.md) |
| designer | [docs/design.md](docs/design.md) |
| planejador | [docs/tarefas.md](docs/tarefas.md), [docs/memoria.md](docs/memoria.md) |
| desenvolvedor | `src/`, `testes/` |

Definições dos agentes em [.claude/agents/](.claude/agents/); o modelo original da equipe está em [equipe-dev-ia/](equipe-dev-ia/).
