# Otimizador de Anúncios Google Ads

App pessoal que se conecta à sua conta do Google Ads (somente leitura), mostra onde a verba está sendo desperdiçada, dá nota de 0 a 100 a cada anúncio e gera títulos e descrições melhores com IA (Claude).

> **Status:** em desenvolvimento. Fases 1–7 prontas (base, conexão, painel, nota e diagnóstico, sugestões com IA, palavras-chave, teste e2e), login Google e suporte à Vercel. Veja [docs/tarefas.md](docs/tarefas.md).
> **Segurança:** configure o login Google de usuário único (`APP_EMAIL_AUTORIZADO`, `APP_SESSAO_SEGREDO`) ou login por senha (`APP_SENHA_HASH`, `APP_SESSAO_SEGREDO`). Em produção, sem uma configuração válida o app se bloqueia.

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

A página inicial apresenta o produto em `/`. Depois do login, o painel protegido fica em `/painel`.

**Só quer ver o app?** O modo de demonstração usa uma conta de exemplo (loja de sofás) e uma IA falsa, sem nenhuma chave:

```bash
npm run demo          # funciona no PowerShell e no bash; landing: / · painel demonstrativo: /painel
```

A demonstração usa um banco separado (`prisma/demo.db`) e nunca toca nos seus dados reais. Ela nunca liga em produção nem na Vercel.

Chaves necessárias no `.env`:

| Variável | Onde conseguir |
|---|---|
| `ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud → APIs e serviços → Credenciais (OAuth, app da Web). Redirect: `http://localhost:3000/api/auth/google/callback` |
| *(sem developer token)* | O Google aposentou o token em 09/09/2026 e o app **não** envia mais o header `developer-token` (header vazio é recusado com `DEVELOPER_TOKEN_PARAMETER_MISSING`). O nível de acesso (precisa ser **Básico** ou Explorer para contas reais) vem do projeto do Google Cloud onde o cliente OAuth foi criado |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Opcional. ID da MCC usada como `login-customer-id` para as contas filhas (com ou sem traços) |
| `APP_EMAIL_AUTORIZADO` | E-mail Google que pode entrar no app (deixe `APP_SENHA_HASH` vazio para habilitar login Google) |
| `APP_SESSAO_SEGREDO` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (Fase 5) |

## Publicar na Vercel

1. **Login do app:** configure `APP_EMAIL_AUTORIZADO` com o e-mail Google autorizado e `APP_SESSAO_SEGREDO` com uma chave aleatória de pelo menos 32 caracteres. Deixe `APP_SENHA_HASH` vazio para usar login Google. Se preferir senha, gere o hash com `npm run gerar-senha -- "uma senha forte com 12+ caracteres"`.
2. **Projeto:** em [vercel.com](https://vercel.com) → *Add New → Project* → importe `asjdecor/otimizador-google-ads`. Não mude nada no build (o `package.json` já tem o `vercel-build`).
3. **Banco:** no projeto da Vercel → *Storage → Create Database → Neon (Postgres)* → conecte ao projeto. Isso cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
4. **Variáveis** (*Settings → Environment Variables*, ambiente *Production*):

   | Variável | Valor |
   |---|---|
   | `APP_EMAIL_AUTORIZADO`, `APP_SESSAO_SEGREDO` | e-mail autorizado e chave aleatória do passo 1 (mantenha `APP_SENHA_HASH` vazio para login Google) |
   | `ENCRYPTION_KEY` | **nova**, gerada com o comando da tabela acima (não reutilize a do PC) |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | os mesmos do `.env` |
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
| `npm run demo` | App com conta de exemplo e IA falsa, sem chaves (banco `demo.db` separado) |
| `npm run test:e2e` | Teste de ponta a ponta no navegador (Playwright, modo demonstração). 1ª vez: `npx playwright install chromium` |
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
