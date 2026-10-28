# Otimizador de Anúncios Google Ads

App pessoal que se conecta à sua conta do Google Ads, mostra onde a verba está sendo desperdiçada, dá nota de 0 a 100 a cada anúncio e ajuda a revisar palavras-chave e campanhas com IA.

> **Status:** em desenvolvimento. Fases 1–7 e 9 prontas (base, conexão, painel, nota e diagnóstico, sugestões com IA, palavras-chave, teste e2e, pesquisa de mercado), login Google e suporte à Vercel. Veja [docs/tarefas.md](docs/tarefas.md).
> **Segurança:** configure o login Google de usuário único (`APP_EMAIL_AUTORIZADO`, `APP_SESSAO_SEGREDO`) ou login por senha (`APP_SENHA_HASH`, `APP_SESSAO_SEGREDO`). Em produção, sem uma configuração válida o app se bloqueia.

## O que ele faz

- **Painel:** custo, cliques, CTR, CPC, conversões; palavras-chave que gastam sem converter; anúncios com CTR abaixo da média do grupo.
- **Anúncios:** nota 0–100 por regras explicadas (limite de caracteres, palavra-chave no título, chamada para ação, títulos repetidos, quantidade de variações, força do anúncio) com "como corrigir".
- **Sugestões com IA:** até 15 títulos e 4 descrições novos por anúncio, sempre dentro de 30/90 caracteres, com histórico e custo estimado.
- **Palavras-chave:** termos de pesquisa, negativas sugeridas (por regra e por IA, com motivo), novas palavras-chave e exportação em CSV para o Google Ads Editor.
- **Análise premium:** compara análises de Claude e OpenAI, consulta ideias e métricas do Planejador do Google e organiza dez perspectivas especialistas. As recomendações são consultivas; nenhuma mudança é aplicada às campanhas.
- **Pesquisa de mercado:** descobre concorrentes, lê o que mostram ao público e recomenda palavras-chave (veja abaixo).
- **A análise premium não altera campanhas** — ela só lê e sugere.

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

**Quer ver a IA de verdade antes de ter as chaves do Google?** Coloque a `ANTHROPIC_API_KEY` no `.env` e rode:

```bash
npm run verificar-ia      # confere a chave sem gastar créditos
npm run demo:ia-real      # loja de exemplo + Claude de verdade (gasta centavos por geração)
```

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
| `OPENAI_API_KEY` | platform.openai.com → API keys (opcional; usado em paralelo com Claude na análise premium) |
| `OPENAI_MODEL` | Modelo OpenAI para a análise premium (opcional; padrão `gpt-4.1-mini`) |

Na tela **Palavras-chave**, a análise premium consulta dados do período selecionado e ideias do Planejador, depois executa em paralelo cada provedor configurado. Se um provedor falhar, o resultado disponível é mostrado com um aviso. Para comparação entre dois modelos, configure ambas as chaves. A consulta do Planejador depende do acesso da conta ao recurso do Google Ads.

Para validar a chave OpenAI sem gerar texto, rode `npm run verificar-openai`. O teste consulta apenas se o modelo está acessível e não usa tokens de geração.

## Pesquisa de mercado

Menu **Pesquisa** (`/pesquisa`). A partir do site, das palavras e das regiões da conta selecionada, o app:

1. busca concorrentes na web;
2. lê o site de cada um (o que vende, promessas, preços, diferenciais, pontos fracos e as fontes);
3. consulta volumes de busca, concorrência e faixa de lance no Planejador de Palavras-chave do Google;
4. recomenda palavras-chave e negativas, que você marca e exporta em CSV para o Google Ads Editor.

- **Custo:** cerca de US$ 0,30 a US$ 1,00 por pesquisa, cobrado na sua conta da Anthropic. O valor aparece na tela.
- **Precisa de** `ANTHROPIC_API_KEY`. Os volumes exigem o developer token com acesso **Básico**; sem ele, a pesquisa funciona, só que sem volumes.
- **Busca na web:** se a Anthropic recusar a pesquisa, habilite a busca na web no Console (*Settings → Privacy*).
- **Limite honesto:** a pesquisa mostra só o que é público (sites e resultados de busca). Ninguém vê as palavras-chave nem os lances que um concorrente compra.
- Nada é alterado no Google Ads. Para ver sem chaves: `npm run demo` e abra `/pesquisa`.

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
   | `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | os mesmos do `.env` (se usar Claude) |
   | `OPENAI_API_KEY`, `OPENAI_MODEL` | os mesmos do `.env` (opcional; habilita a análise OpenAI) |

5. **Google Cloud** → Credenciais → seu cliente OAuth → adicione o mesmo `https://SEU-DOMINIO/api/auth/google/callback` em *URIs de redirecionamento autorizados*.
6. **Publicar:** *Deployments → Redeploy* (ou qualquer push na `main`). Na primeira vez, o build cria as tabelas no Neon.
7. **Domínio próprio** (opcional): *Settings → Domains* → adicione o domínio e siga as instruções de DNS. Depois, atualize os passos 4 e 5 com o domínio novo.

Sem domínio próprio, use o endereço que a Vercel dá (`https://<projeto>.vercel.app`) nos passos 4 e 5.

## Comandos

| Comando | O que faz |
|---|---|
| `npm test` | Testes (Vitest) — usam banco isolado e Google/Claude falsos, sem custo |
| `npm run demo` | App com conta de exemplo e IA falsa, sem chaves (banco `demo.db` separado) |
| `npm run demo:ia-real` | Loja de exemplo com o Claude de verdade (gasta créditos da Anthropic) |
| `npm run verificar-ia` | Confere a `ANTHROPIC_API_KEY` e o modelo, sem gastar créditos |
| `npm run test:e2e` | Teste de ponta a ponta no navegador (Playwright, modo demonstração). 1ª vez: `npx playwright install chromium` |
| `npm run typecheck` | TypeScript estrito |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção |
| `npm run gerar-senha -- "senha"` | Gera `APP_SENHA_HASH` e `APP_SESSAO_SEGREDO` |
| `npm run db:schema-postgres` | Regenera o schema PostgreSQL (Vercel) após mudar `prisma/schema.prisma` |

## Stack

Next.js 15 · React 19 · TypeScript (estrito) · Tailwind 4 · Prisma 6 (SQLite local, PostgreSQL/Neon na Vercel) · Google Ads API (`google-ads-api`) · Anthropic SDK · OpenAI Responses API · Vitest.

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
