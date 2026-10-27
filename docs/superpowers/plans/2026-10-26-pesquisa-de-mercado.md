# Pesquisa de mercado (Parte 1, F6): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela `/pesquisa`. Ela descobre os concorrentes pela web, faz um relatório de cada um e recomenda palavras-chave com volume do Planejador do Google, com exportação em CSV.

**Architecture:** São duas integrações novas. O Planejador entra em `ApiGoogleAds`; a busca e a leitura de páginas entram em `GeradorDeTexto`. Um serviço executa a pesquisa em 4 etapas, salva cada uma em `PesquisaMercado` e a tela chama uma etapa por vez. Os filtros e esquemas são funções puras, testadas isoladamente. A Parte 2 (criar campanha, F7) terá um plano próprio.

**Tech Stack:** Next.js 15, TS 6 estrito, Prisma 6 (SQLite local e Postgres na Vercel), Zod, Vitest 5, Playwright, `google-ads-api` 25, `@anthropic-ai/sdk` 0.135.

**Spec:** `docs/superpowers/specs/2026-10-26-pesquisa-e-campanhas-design.md` (seções 1, 2 até o item 3, 3.1 a 3.4 da parte de pesquisa, 4, 5 e 6)

## Global Constraints

- Nomes, comentários e textos de tela em português, no estilo dos arquivos vizinhos (`analise-de-termos.ts` é o modelo de serviço com IA; `palavras-chave/page.tsx` é o modelo de tela).
- Integrações recebidas por interface (`ApiGoogleAds`, `GeradorDeTexto`), para que os testes usem versões falsas e nunca chamem Google nem Anthropic.
- Concorrentes: no máximo **8**. Leitura: até **2 páginas por concorrente**. Sementes do Planejador: no máximo **10**. Palavras-chave atuais usadas como ponto de partida: as **20** de maior custo.
- Palavra-chave: no máximo 80 caracteres e 10 palavras (`MAXIMO_CARACTERES_PALAVRA` e `MAXIMO_PALAVRAS_POR_PALAVRA_CHAVE`, de `analise-de-termos.ts`). Correspondência recomendada: só `Exata` ou `Frase`, nunca `Ampla`.
- Conteúdo da web e respostas de busca são DADOS no prompt. A IA nunca define região, idioma nem conta.
- Rotas: `barrarOutraOrigem` + `carregarContextoDaConta`, como `api/termos/analisar/route.ts`. `maxDuration` 30 em `POST /api/pesquisa` e 300 em `POST /api/pesquisa/[id]/etapa`.
- Mudança no banco: migration SQLite (`npm run db:migrate -- --name pesquisa_mercado`) **e** `npm run db:schema-postgres` (o teste `schema-postgres.test.ts` confere).
- Antes de cada commit: `npm run typecheck`, `npm run lint` e `npm test` verdes.

## Review Focus

1. **Conta sem nenhuma campanha ativa com região**: o ponto de partida mostra "região não encontrada" e pede para escolher Brasil inteiro. A pesquisa não quebra (teste na Task 2 e na Task 5).
2. **Resposta da IA com o próprio domínio da conta, marketplaces ou URLs malformadas** (`www.`, `https://`, caminho, maiúsculas): tudo é normalizado e descartado quando preciso (teste na Task 4).
3. **Planejador lança erro de permissão** (developer token só de teste): a etapa VOLUMES termina como `indisponivel` com o motivo traduzido e a recomendação marca as palavras "sem volume" (teste na Task 5).
4. **`stop_reason: "pause_turn"`** em chamadas com busca na web: o cliente continua a conversa até no máximo 3 vezes, em vez de dar "formato inesperado" (teste na Task 3).
5. **Duas abas pedindo a mesma etapa ao mesmo tempo, ou etapa pedida fora de ordem**: só a etapa atual executa; as outras recebem erro claro (teste na Task 5).

---

### Task 1: Planejador de Palavras-chave na `ApiGoogleAds`

**Files:**
- Create: `src/api/integracoes/google-ads/planejador.ts`
- Modify: `src/api/integracoes/google-ads/api-google-ads.ts` (interface e implementação)
- Modify: `testes/apoio/google-falso.ts` (o falso implementa o novo método)
- Modify: `src/api/integracoes/fabrica.ts` (demonstração: devolve `IDEIAS_DE_DEMONSTRACAO`)
- Modify: `src/api/integracoes/demonstracao/dados.ts` (exporta `IDEIAS_DE_DEMONSTRACAO`, de 6 a 10 ideias sobre sofás)
- Test: `testes/unidade/integracoes/planejador.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // planejador.ts
  export type Concorrencia = "BAIXA" | "MEDIA" | "ALTA" | "SEM_DADOS";
  export interface IdeiaDePalavra { texto: string; volumeMensal: number | null; concorrencia: Concorrencia; lanceBaixo: number | null; lanceAlto: number | null } // lances em reais
  export interface PedidoDeIdeias { urlSemente?: string; palavrasSemente: string[]; idsGeo: string[]; idioma: string } // idsGeo: "1001773"; idioma: "1014"
  export function mapearIdeiasDePalavras(resposta: unknown): IdeiaDePalavra[];
  // api-google-ads.ts — novo método da interface
  gerarIdeiasDePalavras(credenciais: CredenciaisDeConsulta, pedido: PedidoDeIdeias): Promise<unknown>;
  // planejador.ts
  export async function buscarIdeiasDePalavras(api: ApiGoogleAds, credenciais: CredenciaisDeConsulta, pedido: PedidoDeIdeias): Promise<IdeiaDePalavra[]>;
  ```

- [ ] **Step 1: Escrever os testes que falham**

```ts
describe("mapearIdeiasDePalavras", () => {
  it("converte métricas, enum numérico e micros", () => {
    const r = mapearIdeiasDePalavras({ results: [{ text: "sofá retrátil", keyword_idea_metrics: {
      avg_monthly_searches: 12100, competition: 4, low_top_of_page_bid_micros: 1_230_000, high_top_of_page_bid_micros: 4_560_000 } }] });
    expect(r).toEqual([{ texto: "sofá retrátil", volumeMensal: 12100, concorrencia: "ALTA", lanceBaixo: 1.23, lanceAlto: 4.56 }]);
  });
  it("aceita enum em texto (LOW/MEDIUM/HIGH → BAIXA/MEDIA/ALTA)", ...);
  it("sem keyword_idea_metrics → volume e lances null, SEM_DADOS", ...);
  it("descarta linhas sem text e repete só a 1ª ocorrência de cada texto normalizado", ...);
  it("resposta vazia ou {} → []", ...);
});
it("buscarIdeiasDePalavras repassa o pedido para a api e mapeia", ...); // com criarApiGoogleAdsFalsa
```

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run testes/unidade/integracoes/planejador.test.ts`. Esperado: FAIL, módulo não encontrado.

- [ ] **Step 3: Implementar.** Em `planejador.ts`, mapeador Zod tolerante como `termos.ts`: competition `2|LOW`, `3|MEDIUM`, `4|HIGH`, demais `SEM_DADOS`; micros via `microsParaReais`; dedupe com `normalizarTexto`. Em `api-google-ads.ts`, `gerarIdeiasDePalavras` usa `cliente.Customer({...}).keywordPlanIdeas.generateKeywordIdeas({ customer_id, language: \`languageConstants/${idioma}\`, geo_target_constants: idsGeo.map(id => \`geoTargetConstants/${id}\`), keyword_plan_network: GOOGLE_SEARCH, include_adult_keywords: false, ...semente })`. A semente é `keyword_and_url_seed` quando há URL e palavras, `url_seed` só com URL e `keyword_seed` só com palavras. Troque o comentário "somente leitura no MVP" por "leitura; o Planejador também é só leitura". O falso de teste ganha a opção `ideias?: unknown | Error`. A demonstração devolve `{ results: IDEIAS_DE_DEMONSTRACAO }`.

- [ ] **Step 4: Rodar e ver passar.** Mesmo comando, PASS. Depois `npm run typecheck`.

- [ ] **Step 5: Commit.** `git commit -m "Planejador de Palavras-chave na ApiGoogleAds"`

---

### Task 2: Segmentação e ponto de partida da conta

**Files:**
- Create: `src/api/integracoes/google-ads/segmentacao.ts`
- Modify: `src/api/integracoes/demonstracao/dados.ts` (linhas de `campaign_criterion` com SP capital `1001773` e português `1014`, e URLs finais `https://www.sofas-demo.example/...`). **No `responderConsultaDeDemonstracao`, teste `FROM campaign_criterion` antes de `FROM campaign`.**
- Test: `testes/unidade/integracoes/segmentacao.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Segmentacao { idsGeo: string[]; nomesGeo: string[]; idiomas: string[] }   // sem repetição; idiomas vazio → ["1014"]
  export function montarGaqlNomesGeo(idsGeo: string[]): string; // SELECT geo_target_constant.canonical_name FROM geo_target_constant WHERE geo_target_constant.resource_name IN ('geoTargetConstants/…')
  //   buscarSegmentacao faz a 2ª consulta só se idsGeo não for vazio; ids validados como /^\d+$/ antes de entrar no GAQL
  export const GAQL_SEGMENTACAO: string;   // campaign_criterion.type, .location.geo_target_constant, .language.language_constant, .negative
  //   FROM campaign_criterion WHERE campaign.status = 'ENABLED' AND campaign.advertising_channel_type = 'SEARCH'
  //   AND campaign_criterion.type IN ('LOCATION','LANGUAGE') AND campaign_criterion.negative = FALSE
  export const GAQL_URLS_FINAIS: string;   // ad_group_ad.ad.final_urls FROM ad_group_ad WHERE ad_group_ad.status = 'ENABLED' AND campaign.status = 'ENABLED'
  export function mapearSegmentacao(linhas: unknown[]): Segmentacao;
  export function extrairDominioPrincipal(linhas: unknown[]): string | null; // domínio mais frequente, sem "www.", minúsculo
  export function normalizarDominio(entrada: string): string | null;        // "https://WWW.Loja.com.br/x" → "loja.com.br"; inválido → null
  export async function buscarSegmentacao(api, credenciais): Promise<Segmentacao>;
  export async function buscarDominioPrincipal(api, credenciais): Promise<string | null>;
  ```

- [ ] **Step 1: Escrever os testes que falham.** `montarGaqlNomesGeo(["1001773", "1; DROP"])` lança erro (id inválido). `buscarSegmentacao` sem região não faz a 2ª consulta e devolve `nomesGeo: []`. `mapearSegmentacao` aceita `geo_target_constant: "geoTargetConstants/1001773"`, devolve `["1001773"]`, tira as repetições e ignora as linhas negativas. Sem LANGUAGE, `idiomas` é `["1014"]`. Sem linhas, `idsGeo` é `[]`. `extrairDominioPrincipal` escolhe o domínio mais frequente entre `final_urls` de vários anúncios e, sem URLs, devolve `null`. `normalizarDominio` com `"Loja.COM.br"`, `"https://www.loja.com.br/a?b"`, `"loja"` (null), `""` (null) e `"javascript:alert(1)"` (null).

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run testes/unidade/integracoes/segmentacao.test.ts`, FAIL.

- [ ] **Step 3: Implementar.** `normalizarDominio` usa `new URL()` (com `https://` na frente quando não houver protocolo), aceita só `http:` e `https:` e exige um ponto no hostname.

- [ ] **Step 4: Rodar e ver passar.** PASS, e o teste existente de demonstração (`fabrica.test.ts`) continua verde.

- [ ] **Step 5: Commit.** `git commit -m "Segmentação e domínio principal da conta"`

---

### Task 3: Pesquisa na web no `GeradorDeTexto`

**Files:**
- Modify: `src/api/integracoes/claude/cliente.ts`
- Modify: `testes/apoio/claude-falso.ts` (o falso implementa `pesquisarNaWeb`, guarda os pedidos e devolve `buscasNaWeb: 3`)
- Modify: `src/api/integracoes/fabrica.ts` (o gerador de demonstração implementa `pesquisarNaWeb` com a mesma lógica de `safeParse` sobre `RESPOSTAS_DA_IA_DE_DEMONSTRACAO`, com `buscasNaWeb: 0`)
- Test: `testes/unidade/integracoes/claude.test.ts` (acrescentar)

**Interfaces:**
- Produces:
  ```ts
  export interface RespostaDePesquisa<T> extends RespostaJson<T> { buscasNaWeb: number }
  // novo método de GeradorDeTexto:
  pesquisarNaWeb<T>(pedido: { sistema: string; mensagem: string; esquema: z.ZodType<T>; maxBuscas: number; maxLeituras: number }): Promise<RespostaDePesquisa<T>>;
  export const PRECO_POR_BUSCA_NA_WEB = 0.01; // US$ 10 / 1.000 buscas — conferir na doc da Anthropic ao implementar
  export function estimarCustoEmDolares(modelo: string, tokensEntrada: number, tokensSaida: number, buscasNaWeb = 0): number | null;
  ```

- [ ] **Step 1: Escrever os testes que falham.** Use um `cliente` falso passado para `criarGeradorClaude(config, cliente)`, com `beta.messages.parse` controlado:
  - envia `tools` com `{ type: "web_search_20260318", name: "web_search", max_uses: maxBuscas }` e `{ type: "web_fetch_20260318", name: "web_fetch", max_uses: maxLeituras }`;
  - com `stop_reason: "pause_turn"`, repete a chamada com `messages: [user, { role: "assistant", content: resposta.content }]`, soma os tokens e os `usage.server_tool_use.web_search_requests` das chamadas e devolve o `parsed_output` da última;
  - depois de 3 `pause_turn` seguidos, lança `ErroParaUsuario` com a mensagem "A pesquisa na web demorou demais. Tente esta etapa de novo.";
  - `estimarCustoEmDolares("claude-opus-5-5", 1_000_000, 0, 10)` é `4 + 0.1`;
  - `refusal`, `max_tokens` e `parsed_output` nulo continuam com as mensagens de `interpretarRespostaDoClaude`.

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run testes/unidade/integracoes/claude.test.ts`, FAIL.

- [ ] **Step 3: Implementar.** Use o mesmo `parse`, `betas`, `fallbacks` e `output_config` de `gerarJson`. Erros passam por `traduzirErroDoClaude`. Acrescente uma tradução: `BadRequestError` cuja mensagem cita `web_search` ou `web_fetch` vira "A pesquisa na web não está liberada na sua conta da Anthropic. Ative em Console → Settings → Privacy." A chamada de `estimarCustoEmDolares` em `analise-de-termos.ts` não muda, porque o novo parâmetro tem padrão.

- [ ] **Step 4: Rodar e ver passar.** PASS, e `npm test` inteiro verde.

- [ ] **Step 5: Commit.** `git commit -m "Pesquisa na web no GeradorDeTexto (busca e leitura de páginas)"`

---

### Task 4: Esquemas e filtros puros da pesquisa

**Files:**
- Create: `src/api/servicos/esquema-pesquisa-de-mercado.ts` (só Zod e tipos; importável no navegador, como `esquema-analise-de-termos.ts`)
- Create: `src/api/servicos/filtros-da-pesquisa.ts`
- Test: `testes/unidade/servicos/filtros-da-pesquisa.test.ts`

**Interfaces:**
- Consumes: `normalizarDominio` (Task 2), `IdeiaDePalavra` (Task 1), `normalizarTexto` (`diagnostico.ts`), limites de palavra (`analise-de-termos.ts`).
- Produces:
  ```ts
  // esquema-pesquisa-de-mercado.ts
  export const ETAPAS = ["CONCORRENTES", "SITES", "VOLUMES", "RECOMENDACAO"] as const;
  export type Etapa = (typeof ETAPAS)[number];
  export const esquemaRespostaConcorrentes = z.object({ concorrentes: z.array(z.object({ nome: z.string(), site: z.string(), motivo: z.string() })) });
  export const esquemaRespostaSites = z.object({ relatorios: z.array(z.object({
    site: z.string(), lido: z.boolean(), oQueVende: z.string(), promessas: z.array(z.string()), precos: z.array(z.string()),
    diferenciais: z.array(z.string()), pontosFracos: z.array(z.string()), fontes: z.array(z.string()) })) });
  export const esquemaRespostaRecomendacao = z.object({
    palavras: z.array(z.object({ texto: z.string(), correspondencia: z.enum(["EXATA", "FRASE"]), motivo: z.string() })),
    negativas: z.array(z.object({ termo: z.string(), motivo: z.string() })) });
  export interface Concorrente { nome: string; dominio: string; motivo: string }
  export type RelatorioDeConcorrente = z.infer<typeof esquemaRespostaSites>["relatorios"][number] & { dominio: string };
  export type Volumes = { disponivel: true; ideias: IdeiaDePalavra[] } | { disponivel: false; motivo: string };
  export interface PalavraRecomendada { texto: string; correspondencia: "Exata" | "Frase"; motivo: string; volumeMensal: number | null; concorrencia: Concorrencia; lanceBaixo: number | null; lanceAlto: number | null }
  export interface NegativaSugerida { termo: string; motivo: string }
  export interface PontoDePartida { dominio: string | null; palavras: string[]; idsGeo: string[]; nomesGeo: string[]; idiomas: string[] }
  export interface PesquisaSalva { id: string; criadoEm: string; etapa: Etapa | "CONCLUIDA"; erroEtapa: string | null; custoDolares: number;
    pontoDePartida: PontoDePartida; concorrentes: Concorrente[] | null; relatorios: RelatorioDeConcorrente[] | null;
    volumes: Volumes | null; recomendadas: PalavraRecomendada[] | null; negativas: NegativaSugerida[] | null }
  // filtros-da-pesquisa.ts
  export const MAXIMO_CONCORRENTES = 8;
  export const MARKETPLACES: readonly string[]; // mercadolivre.com.br, amazon.com.br, magazineluiza.com.br, shopee.com.br, americanas.com.br, casasbahia.com.br, olx.com.br, aliexpress.com, google.com, youtube.com, facebook.com, instagram.com, reclameaqui.com.br, wikipedia.org
  export function filtrarConcorrentes(resposta: z.infer<typeof esquemaRespostaConcorrentes>, dominioProprio: string | null): Concorrente[];
  export function filtrarRelatorios(resposta: z.infer<typeof esquemaRespostaSites>, concorrentes: Concorrente[]): RelatorioDeConcorrente[];
  export function filtrarRecomendacoes(resposta: z.infer<typeof esquemaRespostaRecomendacao>, volumes: Volumes, palavrasAtuais: string[]): { recomendadas: PalavraRecomendada[]; negativas: NegativaSugerida[] };
  ```

- [ ] **Step 1: Escrever os testes que falham.**
  - `filtrarConcorrentes`: remove o domínio próprio, inclusive com `www.` e maiúsculas; remove marketplaces e os subdomínios deles (`lista.mercadolivre.com.br`); remove sites inválidos e repetidos; corta em 8; limita o motivo a 200 caracteres.
  - `filtrarRelatorios`: mantém só relatórios de domínios que estão em `concorrentes`. Concorrente sem relatório recebe `{ lido: false, oQueVende: "", ... }`. `fontes` mantém só URLs `http` e `https`.
  - `filtrarRecomendacoes` com `volumes.disponivel = true`: aceita só textos que existem nas ideias (comparação normalizada) e copia volume, concorrência e lances da ideia; descarta palavras já existentes, acima de 80 caracteres ou de 10 palavras, e repetidas. Ordena por volume decrescente. `EXATA` vira `"Exata"`.
  - Com `disponivel = false`: aceita os textos da IA (com os mesmos limites e sem repetir) e coloca `volumeMensal: null` e `concorrencia: "SEM_DADOS"`.
  - Negativas: tira as repetidas, termo de até 80 caracteres, e corta em 50.

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run testes/unidade/servicos/filtros-da-pesquisa.test.ts`, FAIL.

- [ ] **Step 3: Implementar** as três funções. Elas não acessam rede nem banco.

- [ ] **Step 4: Rodar e ver passar.** PASS.

- [ ] **Step 5: Commit.** `git commit -m "Esquemas e filtros da pesquisa de mercado"`

---

### Task 5: Banco e serviço de etapas

**Files:**
- Modify: `prisma/schema.prisma` (model `PesquisaMercado`, como na spec §3.4) + migration `pesquisa_mercado` + `npm run db:schema-postgres`
- Create: `src/api/servicos/pesquisa-de-mercado.ts`
- Test: `testes/integracao/pesquisa-de-mercado.test.ts` (banco de teste, como `testes/integracao/termos.test.ts`)

**Interfaces:**
- Consumes: Tasks 1 a 4; `buscarMetricasDePalavrasChave` e o intervalo de 30 dias de `servicos/periodo.ts`; `traduzirErroGoogleAds`; `ContextoDaConta` pronto.
- Produces:
  ```ts
  export async function montarPontoDePartida(conta: ContextoProntoDaConta): Promise<PontoDePartida>; // ContextoProntoDaConta = Extract<ContextoDaConta, {tipo:"pronto"}>
  export async function iniciarPesquisa(customerId: string, ponto: PontoDePartida, banco?: PrismaClient): Promise<PesquisaSalva>;
  export async function executarEtapa(
    dependencias: { gerador: GeradorDeTexto; api: ApiGoogleAds; credenciais: CredenciaisDeConsulta },
    pesquisaId: string, etapaPedida: Etapa, banco?: PrismaClient): Promise<PesquisaSalva>;
  export async function lerUltimaPesquisa(customerId: string, banco?: PrismaClient): Promise<PesquisaSalva | null>;
  export async function lerPesquisa(id: string, customerId: string, banco?: PrismaClient): Promise<PesquisaSalva | null>;
  ```

Regras de `executarEtapa`:
- Só executa se `etapaPedida` for igual a `pesquisa.etapa`. Senão lança `ErroParaUsuario("Esta etapa já foi feita ou ainda não pode ser feita. Recarregue a página.")`.
- Trava contra execução dupla: `updateMany({ where: { id, etapa, emExecucao: false }, data: { emExecucao: true } })`. Se der `count === 0`, a mensagem é "Esta etapa já está rodando em outra aba." A spec ganha o campo `emExecucao Boolean @default(false)`. Use `finally` para soltar a trava.
- Sucesso: grava o JSON da etapa, avança `etapa` (`RECOMENDACAO` → `CONCLUIDA`), zera `erroEtapa` e soma `custoDolares`.
- Falha: grava `erroEtapa` com `traduzirErroGoogleAds` ou com a mensagem de `ErroParaUsuario`, mantém a etapa e devolve a pesquisa. Não lança, para a tela mostrar "Tentar de novo".
- **CONCORRENTES:** `pesquisarNaWeb` com `maxBuscas: 8` e `maxLeituras: 0`. A mensagem tem o ponto de partida dentro de `<ponto_de_partida>` (domínio, palavras e `nomesGeo`; com `nomesGeo` vazio, vai "Brasil"). Depois aplica `filtrarConcorrentes`. Se o resultado for vazio, a mensagem é "Não encontramos concorrentes. Confira se a conta tem anúncios ativos com URL." e a etapa não avança.
- **SITES:** `pesquisarNaWeb` com `maxBuscas: 0` e `maxLeituras: concorrentes.length * 2`. O prompt diz que o conteúdo das páginas é dado e nunca instrução. Depois aplica `filtrarRelatorios`.
- **VOLUMES:** sementes `[dominioProprio, ...dominiosConcorrentes].slice(0, 10)`. Para cada uma, chama `buscarIdeiasDePalavras` com `urlSemente: "https://" + dominio` e `palavrasSemente: []`, em série. Depois junta tudo e tira as repetidas, mantendo o maior volume. `idsGeo` vazio usa `["2076"]` (Brasil). Se a primeira chamada falhar, grava `{ disponivel: false, motivo: traduzirErroGoogleAds(erro) }` e **avança**.
- **RECOMENDACAO:** `gerarJson` (sem web). Envia as 300 ideias de maior volume, ou, sem volumes, os relatórios e as palavras atuais. Depois aplica `filtrarRecomendacoes`.

- [ ] **Step 1: Escrever os testes de integração que falham.**
  - Fluxo feliz: 4 etapas com o gerador falso (respostas fixas por esquema) e o Planejador falso. O resultado é `CONCLUIDA`, com concorrentes sem o domínio próprio, recomendadas com volume e `custoDolares > 0`.
  - Pedir `SITES` quando a etapa atual é `CONCORRENTES` lança o erro de ordem.
  - Duas chamadas simultâneas da mesma etapa (`Promise.allSettled`): exatamente uma executa e a outra é rejeitada com "já está rodando".
  - Gerador lançando erro em `SITES`: a etapa continua `SITES`, `erroEtapa` fica preenchido e os concorrentes continuam salvos. Uma nova chamada com o gerador bom avança.
  - Planejador lançando erro de permissão: `volumes.disponivel === false`, a etapa avança para `RECOMENDACAO` e as recomendadas saem com `volumeMensal: null`.
  - `montarPontoDePartida` com conta sem segmentação: `idsGeo: []` e as 20 palavras de maior custo.
  - `lerPesquisa` com `customerId` de outra conta devolve `null`.

- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run testes/integracao/pesquisa-de-mercado.test.ts`, FAIL.

- [ ] **Step 3: Migration e implementação.** Rode `npm run db:migrate -- --name pesquisa_mercado` e `npm run db:schema-postgres`. Depois implemente o serviço com as regras acima. Atualize a spec §3.4 com `emExecucao`.

- [ ] **Step 4: Rodar e ver passar.** O teste, `testes/unidade/seguranca/schema-postgres.test.ts` e `npm test` passam.

- [ ] **Step 5: Commit.** `git commit -m "Pesquisa de mercado: banco e serviço de etapas"`

---

### Task 6: Rotas da API

**Files:**
- Create: `src/app/api/pesquisa/route.ts` (`POST`: inicia)
- Create: `src/app/api/pesquisa/[id]/etapa/route.ts` (`POST { etapa }`: executa)
- Test: `testes/integracao/rotas-pesquisa.test.ts`

**Interfaces:**
- Consumes: Task 5.
- Produces: `POST /api/pesquisa` → `{ pesquisa: PesquisaSalva }`. `POST /api/pesquisa/[id]/etapa`, com corpo `{ etapa: Etapa }`, → `{ pesquisa: PesquisaSalva }`. Erros saem por `responderErro` e `responderErroExterno`, como as rotas atuais.

- [ ] **Step 1: Escrever os testes que falham.** Chamam os `POST` exportados com `new Request(...)` e com `vi.mock` de `@/api/http/contexto-da-conta` e `@/api/integracoes/fabrica`:
  - origem diferente dá 403;
  - etapa fora de `ETAPAS` dá 400;
  - id de pesquisa de outra conta dá 404 com "Pesquisa não encontrada.";
  - IA não configurada (`iaConfiguradaNoAmbiente() === false`) dá 400 com "Preencha ANTHROPIC_API_KEY no .env para pesquisar.".

- [ ] **Step 2: Rodar e ver falhar.** FAIL.

- [ ] **Step 3: Implementar.** Seguir `api/termos/analisar/route.ts`. Usar `export const maxDuration = 30` e `300`.

- [ ] **Step 4: Rodar e ver passar.** PASS.

- [ ] **Step 5: Commit.** `git commit -m "Rotas da pesquisa de mercado"`

---

### Task 7: Tela `/pesquisa`

**Files:**
- Create: `src/app/(app)/pesquisa/page.tsx` (servidor: contexto, ponto de partida, última pesquisa)
- Create: `src/componentes/PainelDePesquisa.tsx` (cliente: iniciar, rodar as etapas em sequência, progresso, "Tentar esta etapa de novo")
- Create: `src/componentes/CartaoConcorrente.tsx`
- Create: `src/componentes/TabelaDePalavrasRecomendadas.tsx` (marcar e desmarcar, "Exportar CSV" com as marcadas)
- Modify: `src/api/servicos/csv.ts` (adicionar `montarCsvDeRecomendadas(palavras: PalavraRecomendada[], negativas: NegativaSugerida[]): string`, no formato do Google Ads Editor, com `Campaign`/`Ad group` vazios e `Criterion Type` = Exact/Phrase/Negative Exact, protegido por `escaparCelulaCsv`)
- Modify: `src/componentes/itens-do-menu.ts` (item `{ href: "/pesquisa", rotulo: "Pesquisa", icone: "🔎" }` depois de Palavras-chave)
- Test: `testes/unidade/componentes/componentes-pesquisa.test.tsx` e `testes/unidade/servicos/termos-e-csv.test.ts` (acrescentar)

**Interfaces:**
- Consumes: `PesquisaSalva`, `ETAPAS` e os tipos da Task 4; as rotas da Task 6; `Aviso`, `BotaoConfirmar`, `CardMetrica`, `TabelaDados`, `BotaoExportarCsv` e `formatarMoeda`/`formatarNumero`.

Textos fixos da spec que devem aparecer:
- Aviso no topo: "A pesquisa mostra o que é público (sites e resultados de busca). Ninguém vê as palavras-chave nem os lances que um concorrente compra."
- Progresso: "Buscando concorrentes…", "Lendo os sites…", "Consultando volumes no Google…", "Recomendando palavras…".
- Volumes indisponíveis: "Sem volume (Planejador indisponível: {motivo})".
- Concorrente não lido: "Não foi possível ler o site."
- Região vazia: "Não encontramos a região das suas campanhas; a pesquisa vai considerar o Brasil inteiro."
- Antes de iniciar, junto do ponto de partida (domínio, palavras e regiões por nome): "Custo estimado: US$ 0,30 a US$ 1,00 por pesquisa."

- [ ] **Step 1: Escrever os testes que falham** (`renderToStaticMarkup`, como os testes de componente atuais):
  - `CartaoConcorrente` mostra o domínio, as promessas e as fontes como links com `rel="noopener noreferrer"` e `target="_blank"`; quando `lido: false`, mostra "Não foi possível ler o site.";
  - `TabelaDePalavrasRecomendadas` com `volumeMensal: null` mostra "Sem volume" e a faixa de lance formatada em R$;
  - `PainelDePesquisa` com `erroEtapa` mostra o erro e o botão "Tentar esta etapa de novo", e com `iaConfigurada={false}` mostra o aviso do `.env` sem o botão de iniciar;
  - `montarCsvDeRecomendadas` escapa `=cmd`, `+`, `-` e `@` no começo.

- [ ] **Step 2: Rodar e ver falhar.** FAIL.

- [ ] **Step 3: Implementar.** No `PainelDePesquisa`, depois de iniciar, faça um laço: enquanto `etapa !== "CONCLUIDA"` e não houver `erroEtapa`, chame a rota da etapa atual e atualize o estado. Mostre o custo acumulado em US$ com 2 casas.

- [ ] **Step 4: Rodar e ver passar.** PASS. Depois `npm run build` sem erros.

- [ ] **Step 5: Commit.** `git commit -m "Tela de pesquisa de mercado"`

---

### Task 8: Demonstração, teste ponta a ponta e documentos

**Files:**
- Modify: `src/api/integracoes/demonstracao/dados.ts` (3 respostas novas em `RESPOSTAS_DA_IA_DE_DEMONSTRACAO`: concorrentes, com 3 domínios `.example` e um deles igual ao próprio para provar o filtro; relatórios; recomendação. **Cada uma só pode passar no esquema certo**, porque o gerador de demonstração escolhe pelo `safeParse`)
- Modify: `testes/unidade/integracoes/fabrica.test.ts` (cada esquema novo recebe a sua resposta e os esquemas antigos continuam recebendo as deles)
- Modify: `testes/e2e/fluxo-principal.spec.ts` (depois de palavras-chave: abrir Pesquisa → Pesquisar concorrentes → esperar "Palavras recomendadas" → ver 2 concorrentes → baixar o CSV)
- Modify: `docs/tarefas.md` (Fase 9, Parte 1 com as tarefas como "Feita"), `docs/memoria.md` (o que foi feito e as lições), `README.md` (seção "Pesquisa de mercado": custo, acesso Básico, habilitar busca na web na Anthropic)

- [ ] **Step 1: Escrever e ajustar os testes** (`fabrica.test.ts` e o passo novo no e2e).
- [ ] **Step 2: Rodar e ver falhar.** `npx vitest run testes/unidade/integracoes/fabrica.test.ts`, FAIL.
- [ ] **Step 3: Acrescentar as respostas de demonstração.**
- [ ] **Step 4: Verificação completa.** `npm run typecheck`, `npm run lint`, `npm test` e `npm run test:e2e` verdes. Depois `npm run demo` e um teste manual em http://localhost:3000/pesquisa.
- [ ] **Step 5: Commit.** `git commit -m "Pesquisa de mercado: demonstração, e2e e documentação"`

---

## Depois da execução: teste manual com as APIs reais (revisão final, 2026-10-27)

O código nunca chamou a Anthropic nem o Google de verdade (sem chaves). Antes de confiar na função:

**Anthropic**
1. A API aceita `web_search_20260318` / `web_fetch_20260318` (com `max_content_tokens` e `allowed_domains`) junto do beta `server-side-fallback-2026-07-01`, sem outro cabeçalho.
2. Retomar um `pause_turn` reenviando todos os blocos acumulados não dá erro 400, e a resposta retomada traz só os blocos novos (senão as anotações duplicam).
3. `usage.server_tool_use.web_search_requests` vem preenchido; URLs das fontes aparecem nos cartões.
4. As anotações da fase A são boas o bastante para preencher um relatório por concorrente.
5. Tempo de cada etapa (SITES < 240 s) e custo mostrado × cobrança no Console (meta US$ 0,30 a 1,00).
6. Com a busca na web desligada no Console, aparece a mensagem "não está liberada".
7. `allowed_domains` aceita o `www.` dos domínios listados (senão SITES lê menos páginas).

**Google Ads**
8. `generateKeywordIdeas` com `url_seed` e `login_customer_id` (conta filha de MCC) devolve uma lista.
9. Volume e lances chegam como número/texto, não como objeto Long (senão tudo vira "Sem volume").
10. Sem acesso Básico, a mensagem "volumes indisponíveis" é legível.
11. `GAQL_SEGMENTACAO` e `GAQL_URLS_FINAIS` rodam sem erro numa conta real com muitas regiões.

**Editor e Vercel**
12. O CSV `pesquisa-de-mercado.csv` (Campaign/Ad group vazios, `Negative exact`) importa no Google Ads Editor; se não importar, rever o formato.
13. O plano da Vercel aceita `maxDuration = 300`.

Pendências adiadas na revisão final: erro na 1ª semente desativa todos os volumes (avaliar `site_seed`); custo aparece como zero com modelo fora da tabela de preços; 4 consultas ao Google sem cache a cada abertura de `/pesquisa`; marcas de concorrentes podem aparecer entre as palavras recomendadas.
