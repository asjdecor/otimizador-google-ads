# Memória do projeto

> Dono: agente `planejador`

**Atualizado:** 2026-10-15
**Fase atual:** Fases 1 a 7 com código pronto. Só faltam ações do usuário: testar na conta real (e conferir as métricas, ≤ 1%) e publicar na Vercel.

## Já feito
- ✔ Os 6 docs. Mudanças aprovadas: SQLite no lugar de PostgreSQL/Docker e Node 24.
- ✔ **Fase 1, Base:** Next.js 15 + TS 6 estrito + Tailwind 4 + Vitest 5 + Prisma 6/SQLite, tokens de design, layout, componentes base e criptografia AES-256-GCM.
- ✔ **Fase 2, Conexão:**
  - OAuth: `/api/auth/google` → Google → `/api/auth/google/callback`, com estado anti-CSRF em cookie httpOnly. O refresh token é salvo criptografado.
  - `listarContasAcessiveis`: contas diretas + filhas de MCC, guardando o `loginCustomerId` de cada uma (nova migration `conta_login_customer_id`).
  - Seleção de conta (MCC não pode ser escolhida), atualização da lista e desconexão (apaga tudo e tenta revogar no Google).
  - Cache de 15 min (`consultarComCache`, `limparCacheDaConta`) + botão **Atualizar** no topo.
  - Tela `/conectar` (avisa o que falta no `.env`, lista as contas) + SeletorConta no topo.
  - `traduzirErroGoogleAds` (token expirado, developer token só de teste, permissão, cota…) e `ErroParaUsuario` para mensagens prontas.
  - POSTs só aceitos da mesma origem.
- ✔ **Fase 3, Métricas e desperdício:**
  - `integracoes/google-ads/metricas.ts`: GAQL de campanhas, palavras-chave (`keyword_view`) e anúncios (`ad_group_ad`) com `segments.date BETWEEN`; mapeadores Zod que aceitam enums numéricos ou em texto; `microsParaReais` sem arredondar.
  - `servicos/periodo.ts`: 7/30/90 dias terminando ontem (como o Google Ads), guardado no cookie `periodo`.
  - `servicos/desperdicio.ts`: métricas derivadas a partir das somas; palavras com custo > limite e 0 conversões; gasto total sem conversão; anúncios com CTR < 70% do CTR ponderado do grupo e ≥ 100 impressões.
  - `servicos/painel.ts`: as 3 consultas em paralelo, com cache. As regras rodam sobre o cache, então mudar o limite não consulta o Google de novo.
  - `servicos/configuracao.ts` + rota `/api/configuracao/limite` + FormularioLimite.
  - Tela Painel: 6 KPIs, card de gasto sem conversão, tabelas ordenáveis (desperdício, CTR baixo, campanhas). SeletorPeriodo no topo.
- ✔ **Fase 4, Nota e diagnóstico:**
  - `integracoes/google-ads/anuncios.ts`: GAQL de RSA (títulos, descrições, URL, `ad_strength`, status) e das palavras positivas por grupo. Sem período: é a foto atual. Enum AdStrength: 4 RUIM, 5 MEDIA, 6 BOA, 7 EXCELENTE, 2 PENDENTE.
  - `servicos/diagnostico.ts`: `calcularNotaDoAnuncio` é pura, com 6 regras e pesos que somam 100 (poucos títulos 12, poucas descrições 8, limite de caracteres 15, palavra-chave no título 20, CTA 15, duplicados 10, força Ruim 20 / Média 10). Conta caracteres resolvendo `{KeyWord:padrão}`. A comparação de texto ignora maiúsculas, acentos e pontuação; a palavra-chave precisa casar como palavra inteira.
  - `servicos/anuncios.ts`: lista com nota + métricas (reaproveita o cache de métricas de anúncios do painel). O id na URL é `grupo~anuncio`.
  - `http/contexto-da-conta.ts`: carrega conta, período, configuração e API para todas as telas de dados (painel e anúncios usam).
  - Telas: `/anuncios` (tabela da pior para a melhor nota, com link) e `/anuncios/[id]` (SeloNota, métricas, diagnóstico com "como corrigir" e pontos perdidos, títulos e descrições com contador). No painel, os anúncios com CTR baixo agora têm link.
- ✔ **Fase 5, Reescrita com IA:**
  - `integracoes/claude/cliente.ts`: `client.beta.messages.parse` + `betaZodOutputFormat` (`@anthropic-ai/sdk/helpers/beta/zod`), `effort: "medium"`, `fallbacks: "default"` com beta `server-side-fallback-2026-07-01`. O modelo padrão é **`claude-opus-5-5`** (`CLAUDE_MODEL` troca). `interpretarRespostaDoClaude` (recusa, corte, formato inválido) e `traduzirErroDoClaude` usam as classes de erro do SDK. `estimarCustoEmDolares` tem a tabela de preços.
  - `servicos/sugestoes.ts`: o prompt marca o anúncio, as palavras e o contexto como dados e proíbe inventar preço, prazo ou garantia; segue as políticas do Google (sem "!" em títulos). `filtrarTextosValidos` descarta textos acima de 30/90, repetidos e os que já existem. Até 3 chamadas, pedindo complemento citando o que estourou. Limita a 15 títulos e 4 descrições. Histórico na tabela `Sugestao` (tipo TITULOS_DESCRICOES).
  - Rota `POST /api/sugestoes` + PainelDeSugestoes (contexto opcional de 500 caracteres, AvisoRevisao, ItemSugestao com contador e copiar, "Copiar todos", custo estimado, gerações anteriores).
  - Teste do critério do PRD: 30 rodadas de respostas aleatórias, nenhuma sugestão acima do limite.
- ✔ **Repositório público:** https://github.com/asjdecor/otimizador-google-ads (e-mail noreply nos commits; `.env` e banco fora do git, conferido no GitHub).
- ✔ **Fase 6, Palavras-chave:**
  - `integracoes/google-ads/termos.ts`: `search_term_view` com período; status 2 ADICIONADO, 3 EXCLUIDO, 4 ADICIONADO_E_EXCLUIDO, 5 NENHUMA.
  - `servicos/termos.ts` (puro): negativas por regra (gastou, 0 conversão, situação NENHUMA, Exata, até 100); palavras novas por regra (converteu, não é palavra do grupo; 2+ conversões Exata, 1 Frase).
  - `servicos/csv.ts`: formato do Google Ads Editor (Campaign, Ad group, Keyword, Criterion Type), BOM, **proteção contra injeção de fórmula** (termos vêm de qualquer pessoa).
  - `servicos/analise-de-termos.ts`: uma chamada ao Claude devolve negativas e variações. Os termos são tratados como não confiáveis no prompt. **Negativa só é aceita se o termo existir** (sem conversão, não excluído). Variações respeitam 80 caracteres e 10 palavras, não repetem existentes, e o grupo vem do `termo_de_origem`. Salva como `Sugestao` tipo `ANALISE_TERMOS`; o esquema puro em `esquema-analise-de-termos.ts` também é usado no navegador.
  - Tela `/palavras-chave`: resumo, negativas, palavras novas, painel de IA (contexto "o que vende e o que não vende") e todos os termos; botões de exportar CSV (gerado no navegador).
  - `EmBreve` removido (não tinha mais uso).
- ✔ **Fase 7, teste e2e:**
  - `src/api/integracoes/fabrica.ts`: rotas e telas criam Google, OAuth e Claude por aqui. Com `APP_DADOS_FALSOS=1` (**só fora de produção e fora da Vercel**, teste cobre a trava) usa a conta de demonstração em `integracoes/demonstracao/dados.ts` (MCC + 2 contas de loja de sofás) e respostas fixas da IA.
  - `playwright.config.ts`: `next dev -p 3999`, banco `prisma/e2e.db` recriado no globalSetup, login ativo com senha do teste. `npm run test:e2e` = 2 testes (login; fluxo completo até CSV e desconectar), estáveis mesmo com o cache frio.
  - `npm run demo` (scripts/demo.mjs) migra e usa `prisma/demo.db`. Se a demonstração for ligada apontando para `dados.db`, `urlDoBancoParaOAmbiente` troca para `demo.db` (bug real: a 1ª versão gravou a conexão falsa no banco real, já limpo).
  - Lições: esperar `networkidle` antes de clicar (hidratação em dev); `waitForURL` com 90 s na 1ª navegação de cada rota (compilação em dev); o Next tem um `role="alert"` próprio (route announcer), então procure pelo texto.
- ✔ **Fase 8, preparação para a Vercel:**
  - Login: `src/api/seguranca/sessao.ts` (Web Crypto, funciona no Edge) + `senha.ts` (scrypt, formato `scrypt:salt:hash`, sem `$` porque o Next expande o `.env`) + `src/middleware.ts`. Tela `/login`, rotas `/api/auth/entrar` e `/api/auth/sair`, BotaoSair. Script `npm run gerar-senha -- "senha"`.
  - As telas foram para o grupo `src/app/(app)/`. O layout raiz é só a casca, para o login não carregar dados da conta.
  - Postgres: `scripts/gerar-schema-postgres.mjs` → `prisma/postgres/schema.prisma` + `migrations/0_inicial`. `vercel-build` verifica, gera, roda o `migrate deploy` e o build. `maxDuration = 60` nas rotas lentas.
  - Teste de fumaça em produção: redireciona para o login, 401 na API, cookie forjado recusado, 503 sem senha.
- ✔ 267 testes de unidade/integração + 2 e2e passando (banco de teste isolado em `prisma/teste.db`, Google falso em `testes/apoio/google-falso.ts`); typecheck, lint e build ok; teste de fumaça das rotas GET ok.

## Notas técnicas
- npm 11: install scripts aprovados em `allowScripts`. Pacote novo com script: `npm approve-scripts <pacote>`.
- Vitest 5 usa `oxc` para JSX. Testes de componente usam `renderToStaticMarkup`.
- TS 6 exige `src/tipos/css.d.ts`.
- `lerChaveDeCriptografia(undefined)` usa o `.env` (parâmetro padrão). Para testar "ausente", passe `""`.
- Os subagentes estão bloqueados pelo plugin vaara-governance. O assistente principal faz os papéis da equipe. O mesmo plugin bloqueia `curl -X POST`, mesmo para localhost; teste os POSTs por testes automatizados.
- Para ler uma conta filha de MCC, use sempre `loginCustomerId` da `ContaAds` nas consultas (`ApiGoogleAds.consultar`).
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` do `.env` não é usado: cada `ContaAds` guarda seu próprio `loginCustomerId`, descoberto na listagem.
- Testes de componente: o React 19 nem sempre insere `<!-- -->` entre textos vizinhos; use regex com o marcador opcional.
- Publicação online (PRD § 4.1, Fase 8): **não publicar sem o login do app**. SQLite não roda na Vercel; é preciso Postgres (ex.: Neon).

## Parou em
O código do MVP e da publicação está completo. Próximos passos dependem do usuário: (1) ver o app com `npm run demo`; (2) preencher o `.env` e testar na conta real, comparando custo, cliques e conversões com o Google Ads (critério ≤ 1%, tarefa da Fase 7); (3) publicar na Vercel (README) e informar o domínio. Se ele pedir algo novo, passar pelo agente `produto` (PRD) antes de codar; candidatos estão em "Desejáveis" no PRD (aplicar mudanças via API, alertas por e-mail, relatório PDF).
