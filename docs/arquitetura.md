# Arquitetura — Otimizador de Anúncios Google Ads

> Dono: agente `arquiteto` · Atualizado: 2026-10-15 · Base: `docs/prd.md`
> Mudança 2026-10-15: modelo de IA padrão `claude-sonnet-5-5` → `claude-opus-5-5` (troca de modelo por custo é decisão do usuário).
> Mudança 2026-10-15 (aprovada pelo usuário): PostgreSQL/Docker → **SQLite** (Docker não instalado; app de usuário único). Node 22 → **Node 24** (versão instalada).

## 1. Camadas

```
Navegador (usuário único)
   │  HTTPS / localhost
   ▼
Web — Next.js (App Router): telas em src/app
   │  chama rotas internas /api/*
   ▼
API — Route Handlers Node + TypeScript (src/app/api/*)
   │  só repassam para a camada de regras em src/api/*
   ├──► Regras (src/api/servicos): diagnóstico, desperdício, prompts
   ├──► Integração Google Ads (src/api/integracoes/google-ads) ──► Google Ads API (GAQL, somente leitura)
   ├──► Integração Claude (src/api/integracoes/claude) ──────────► Anthropic API
   ▼
Banco — SQLite (arquivo `prisma/dados.db`, via Prisma): tokens OAuth criptografados, contas, cache, sugestões
```

Fluxo principal:
1. **OAuth:** `/api/auth/google`, depois o callback do Google. O refresh token é salvo criptografado (AES-256-GCM, chave em `ENCRYPTION_KEY`).
2. **Leitura:** o serviço monta uma consulta GAQL, a integração Google Ads executa e o resultado vai para o cache (`cache_consulta`, TTL de 15 min) antes de voltar para a tela.
3. **Diagnóstico:** função pura `calcularNotaDoAnuncio(anuncio, palavrasChave)` que recebe dados e devolve nota e problemas. Não faz I/O, então é 100% testável.
4. **IA:** o serviço monta o prompt, a integração Claude pede saída JSON estruturada, o validador descarta textos acima do limite (até 2 novas tentativas) e o resultado é salvo em `sugestao`.

Regras de arquitetura:
- Toda chamada externa (Google Ads, Claude) fica **só** em `src/api/integracoes/`. Os serviços recebem essas integrações por parâmetro, para poder usar versões falsas (mocks) nos testes.
- Route Handlers são finos: validam a entrada com Zod, chamam um serviço e devolvem JSON.
- O MVP é **somente leitura** no Google Ads. Nenhuma mutação da API é chamada.

## 2. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Tela | Next.js 15 (App Router) + Tailwind CSS | Padrão da equipe; telas e API no mesmo projeto. |
| API | Node 24 + TypeScript (Route Handlers do Next) | Padrão da equipe. |
| Validação | Zod | Valida a entrada das rotas e o JSON que volta da IA. |
| Banco | SQLite + Prisma 6 (migrations) | Usuário único: banco em arquivo, zero instalação. Migrations versionadas; trocar para PostgreSQL depois só exige mudar o `provider`. |
| Google Ads | Google Ads API (REST/GAQL), via biblioteca `google-ads-api` | Leitura de campanhas, anúncios, palavras-chave e termos de pesquisa. |
| OAuth | `google-auth-library` | Login e refresh token. |
| IA | `@anthropic-ai/sdk`, modelo padrão `claude-opus-5-5` (configurável por `CLAUDE_MODEL`; `claude-sonnet-5-5` custa metade) | Modelo recomendado atual. Saída estruturada com Zod (`beta.messages.parse` + `betaZodOutputFormat`), `effort: medium` e `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) para recusas falsas dos filtros de segurança. |
| Testes | Vitest (unidade/integração) + Playwright (1 fluxo e2e) | Rápidos e com suporte a TypeScript. |
| Deploy | **Vercel** (importando o repositório do GitHub; script `vercel-build`). Local: `npm run dev` | Pedido do usuário (PRD § 4.1). Sem CLI: a Vercel publica a cada push na `main`. |
| Banco em produção | **PostgreSQL (Neon, integração da Vercel)**. Schema gerado de `prisma/schema.prisma` por `scripts/gerar-schema-postgres.mjs` → `prisma/postgres/` (migrations próprias) | SQLite não funciona na Vercel. Local e testes seguem em SQLite (nada para instalar); teste garante que os dois schemas têm os mesmos modelos. |
| Login | Senha única (hash scrypt em `APP_SENHA_HASH`), sessão em cookie httpOnly assinado com HMAC (`APP_SESSAO_SEGREDO` + hash da senha), `src/middleware.ts` protege tudo | Na Vercel/produção, sem senha o app bloqueia tudo (503). No PC, sem senha o login fica desligado. |

Variáveis de ambiente (`.env`, nunca commitado; `.env.example` versionado):
`DATABASE_URL`, `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (opcional, MCC), `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`.

### Modelo de dados (Prisma)
- `ConexaoGoogle`: id, email, refreshTokenCriptografado, criadoEm
- `ContaAds`: id, customerId, nome, moeda, ehGerente, conexaoId, selecionada, loginCustomerId (MCC usada para acessar a conta; migration `conta_login_customer_id`)
- `CacheConsulta`: chave (conta + consulta + período), json, expiraEm
- `Sugestao`: id, customerId, anuncioId, tipo (`TITULOS_DESCRICOES` | `ANALISE_TERMOS`), contextoUsuario, resultadoJson, modelo, tokensEntrada, tokensSaida, criadoEm
- `Configuracao`: limiteDesperdicio (padrão 50), periodoPadrao (padrão 30)

## 3. Pastas

```
equipe-dev-ia/
├─ docs/                      prd, arquitetura, regras, design, tarefas, memoria
├─ scripts/                  gerar-senha.mjs, gerar-schema-postgres.mjs
├─ src/
│  ├─ middleware.ts           porteiro do login (todas as rotas)
│  ├─ app/                    TELAS (Next.js App Router)
│  │  ├─ layout.tsx           só a casca HTML (o login usa este)
│  │  ├─ login/               tela pública de login
│  │  ├─ (app)/layout.tsx     menu + topo com dados da conta (só telas protegidas)
│  │  ├─ (app)/page.tsx       painel (métricas + desperdício)
│  │  ├─ conectar/            tela de conexão OAuth
│  │  ├─ anuncios/[id]/       nota + diagnóstico + reescrita IA
│  │  ├─ palavras-chave/      termos de pesquisa, negativas, novas
│  │  └─ api/                 Route Handlers finos (só chamam src/api)
│  ├─ api/                    REGRAS
│  │  ├─ servicos/            diagnostico.ts, desperdicio.ts, sugestoes.ts, palavras-chave.ts
│  │  ├─ integracoes/
│  │  │  ├─ google-ads/       cliente, consultas GAQL, mapeadores
│  │  │  └─ claude/           cliente, prompts, validação de saída
│  │  ├─ banco/               prisma client, repositórios
│  │  └─ seguranca/           criptografia de tokens
│  └─ componentes/            componentes de UI reutilizáveis (design.md)
├─ prisma/                    schema.prisma + migrations/ (+ dados.db, fora do git)
├─ testes/
│  ├─ unidade/                espelha src/api
│  ├─ integracao/             rotas com integrações falsas (mock)
│  └─ e2e/                    Playwright
└─ .env.example
```
