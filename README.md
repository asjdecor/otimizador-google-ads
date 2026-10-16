# Otimizador de Anúncios Google Ads

App pessoal que se conecta à sua conta do Google Ads (somente leitura), mostra onde a verba está sendo desperdiçada, dá nota de 0 a 100 a cada anúncio e gera títulos e descrições melhores com IA (Claude).

> **Status:** em desenvolvimento. Fases 1–6 prontas (base, conexão, painel, nota e diagnóstico, sugestões com IA, palavras-chave) + login e suporte à Vercel. Veja [docs/tarefas.md](docs/tarefas.md).
> **Segurança:** online, o app exige senha (variáveis `APP_SENHA_HASH` e `APP_SESSAO_SEGREDO`). Sem elas, ele se bloqueia sozinho.

## O que ele faz

- **Painel:** custo, cliques, CTR, CPC, conversões; palavras-chave que gastam sem converter; anúncios com CTR abaixo da média do grupo.
- **Anúncios:** nota 0–100 por regras explicadas (limite de caracteres, palavra-chave no título, chamada para ação, títulos repetidos, quantidade de variações, força do anúncio) com "como corrigir".
- **Sugestões com IA:** até 15 títulos e 4 descrições novos por anúncio, sempre dentro de 30/90 caracteres, com histórico e custo estimado.
- **Palavras-chave:** termos de pesquisa, negativas sugeridas (por regra e por IA, com motivo), novas palavras-chave e exportação em CSV para o Google Ads Editor.
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

## Publicar na Vercel

1. **Senha do app** (no seu PC): `npm run gerar-senha -- "uma senha forte com 12+ caracteres"` e guarde as duas linhas que aparecem.
2. **Projeto:** em [vercel.com](https://vercel.com) → *Add New → Project* → importe `asjdecor/otimizador-google-ads`. Não mude nada no build (o `package.json` já tem o `vercel-build`).
3. **Banco:** no projeto da Vercel → *Storage → Create Database → Neon (Postgres)* → conecte ao projeto. Isso cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
4. **Variáveis** (*Settings → Environment Variables*, ambiente *Production*):

   | Variável | Valor |
   |---|---|
   | `APP_SENHA_HASH`, `APP_SESSAO_SEGREDO` | as duas linhas do passo 1 |
   | `ENCRYPTION_KEY` | **nova**, gerada com o comando da tabela acima (não reutilize a do PC) |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN` | os mesmos do `.env` |
   | `GOOGLE_REDIRECT_URI` | `https://SEU-DOMINIO/api/auth/google/callback` |
   | `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | os mesmos do `.env` |

5. **Google Cloud** → Credenciais → seu cliente OAuth → adicione o mesmo `https://SEU-DOMINIO/api/auth/google/callback` em *URIs de redirecionamento autorizados*.
6. **Publicar:** *Deployments → Redeploy* (ou qualquer push na `main`). Na primeira vez, o build cria as tabelas no Neon.
7. **Domínio próprio** (opcional): *Settings → Domains* → adicione o domínio e siga as instruções de DNS. Depois, atualize os passos 4 e 5 com o domínio novo.

Sem domínio próprio, use o endereço que a Vercel dá (`https://<projeto>.vercel.app`) nos passos 4 e 5.

## Comandos

| Comando | O que faz |
|---|---|
| `npm test` | Testes (Vitest) — usam banco isolado e Google/Claude falsos, sem custo |
| `npm run typecheck` | TypeScript estrito |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção |
| `npm run gerar-senha -- "senha"` | Gera `APP_SENHA_HASH` e `APP_SESSAO_SEGREDO` |
| `npm run db:schema-postgres` | Regenera o schema PostgreSQL (Vercel) após mudar `prisma/schema.prisma` |

## Stack

Next.js 15 · React 19 · TypeScript (estrito) · Tailwind 4 · Prisma 6 (SQLite local, PostgreSQL/Neon na Vercel) · Google Ads API (`google-ads-api`) · Anthropic SDK (`claude-opus-5-5`) · Vitest.

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
