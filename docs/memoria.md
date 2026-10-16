# Memória do projeto

> Dono: agente `planejador`

**Atualizado:** 2026-10-15
**Fase atual:** Fases 2, 3 e 4 com código pronto (faltam os testes manuais com a conta real). A próxima é a Fase 5 (Reescrita com IA).

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
- ✔ 167 testes passando (banco de teste isolado em `prisma/teste.db`, Google falso em `testes/apoio/google-falso.ts`); typecheck, lint e build ok; teste de fumaça das rotas GET ok.

## Notas técnicas
- npm 11: install scripts aprovados em `allowScripts`. Pacote novo com script: `npm approve-scripts <pacote>`.
- Vitest 5 usa `oxc` para JSX. Testes de componente usam `renderToStaticMarkup`.
- TS 6 exige `src/tipos/css.d.ts`.
- `lerChaveDeCriptografia(undefined)` usa o `.env` (parâmetro padrão). Para testar "ausente", passe `""`.
- Os subagentes estão bloqueados pelo plugin vaara-governance. O assistente principal faz os papéis da equipe. O mesmo plugin bloqueia `curl -X POST`, mesmo para localhost; teste os POSTs por testes automatizados.
- Para ler uma conta filha de MCC, use sempre `loginCustomerId` da `ContaAds` nas consultas (`ApiGoogleAds.consultar`).
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` do `.env` não é usado: cada `ContaAds` guarda seu próprio `loginCustomerId`, descoberto na listagem.
- A página `/anuncios/[id]` tem um bloco reservado para "Gerar sugestões com IA" (Fase 5): trocar o placeholder pelo formulário real.

## Parou em
Fase 5, primeira tarefa: integração Claude em `src/api/integracoes/claude/`, com cliente `@anthropic-ai/sdk`, modelo de `CLAUDE_MODEL` e saída JSON validada por Zod (`{ titulos: string[], descricoes: string[] }`). Mock nos testes. Depois, `gerarSugestoesDeTitulos`: prompt com o texto atual, as palavras do grupo, a URL e o contexto do usuário; descartar textos > 30/90 com `contarCaracteresVisiveis` (de `diagnostico.ts`) e tentar até 2 vezes de novo. Antes de codar, conferir com a skill `claude-api` a forma atual de saída estruturada do SDK. **Em paralelo, o usuário** preenche o `.env` (inclusive `ANTHROPIC_API_KEY`) e testa as Fases 2 a 4 na conta real.
