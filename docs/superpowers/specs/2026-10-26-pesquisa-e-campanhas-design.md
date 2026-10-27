# Pesquisa de mercado e criação de campanhas — design

> Aprovado em conversa em 2026-10-26 (seções 1, 2 e 3). Falta a revisão desta especificação escrita.
> Funcionalidades do PRD: F6 (pesquisa de mercado) e F7 (criar campanha a partir da pesquisa).

## 1. Objetivo

O dono do app quer duas coisas, a partir da conta selecionada:

1. **Investigar o mercado:** descobrir sozinho quem são os concorrentes na região das campanhas, entender o que cada um oferece e receber uma lista de palavras-chave recomendadas, com volume de buscas real.
2. **Investir com um comando:** dizer "invista R$ X por dia" e o app montar uma campanha com as palavras pesquisadas e colocá-la no ar, depois de uma tela de revisão e **um clique** em Publicar.

### O que foi decidido com o usuário
| Pergunta | Decisão |
|---|---|
| Para que serve a investigação | Relatório por concorrente **e** lista de palavras recomendadas |
| Quem são os concorrentes | O app descobre sozinho (pesquisa na web) |
| Região | A mesma segmentação geográfica das campanhas da conta |
| Fonte das palavras | Abordagem A: pesquisa na web pelo Claude + Planejador de Palavras-chave do Google |
| Publicação | Tela de revisão e publica **ativa** com 1 clique; nunca sem o clique |
| Valor informado | Orçamento **por dia** (R$) |

### Limites honestos (aparecem na tela)
- Ninguém vê as palavras-chave nem os lances que um concorrente compra. O relatório mostra o que está **público** (sites e resultados de busca).
- Os volumes de buscas vêm do Planejador do Google. Sem acesso Básico no developer token, as palavras aparecem sem volume.
- Anúncios novos passam pela revisão de políticas do Google (de horas a 1 dia) antes de rodar.

### Sucesso
- Uma pesquisa completa em até 3 minutos, com 3 a 8 concorrentes reais (com links das fontes) e 20 a 50 palavras com volume de buscas que a conta ainda não usa.
- Custo da pesquisa entre US$ 0,30 e US$ 1,00, mostrado na tela.
- Da pesquisa até a campanha enviada ao Google em menos de 5 minutos.
- Nenhuma campanha é criada acima dos tetos de orçamento (há teste automatizado).

## 2. Fluxo do usuário

Tela nova **"Pesquisa de mercado"** (`/pesquisa`), no menu ao lado de "Palavras-chave".

1. **Iniciar.** O app mostra o ponto de partida tirado da conta: domínios das URLs finais, as principais palavras-chave atuais (por custo, até 20) e as regiões e idiomas das campanhas ativas. Também mostra o custo estimado. Botão "Pesquisar concorrentes".
2. **Progresso.** As etapas aparecem uma a uma: buscando concorrentes → lendo sites → consultando volumes → recomendando palavras. Cada etapa concluída fica salva.
3. **Resultado** (salvo no histórico da conta):
   - **Concorrentes:** um cartão por concorrente com site, o que vende, promessas, preços públicos, diferenciais, pontos fracos e os links das fontes.
   - **Palavras recomendadas:** tabela com palavra, volume mensal, concorrência, faixa de lance (baixa e alta), tipo de correspondência sugerido e motivo. Cada linha pode ser marcada ou desmarcada. Botão "Exportar CSV" (formato já existente do Google Ads Editor).
   - **Negativas sugeridas:** termos que atraem quem não compra, com o motivo.
4. **Criar campanha.** Botão "Criar campanha" no resultado. O formulário pede:
   - orçamento por dia (R$), que não pode passar dos tetos;
   - nome (o app sugere "Pesquisa AAAA-MM-DD – <tema>").
   A IA agrupa as palavras marcadas em 1 a 3 grupos por tema e escreve 1 anúncio responsivo por grupo, com 10 a 15 títulos e 4 descrições nos limites de 30/90 caracteres.
5. **Revisão.** Mostra grupos, palavras, negativas, anúncios (editáveis), região, idioma, estratégia de lance e **gasto máximo estimado no mês** (orçamento diário × 30,4). O app roda o ensaio do Google (`validate_only`) e mostra problemas por item. Botões "Publicar campanha" e "Cancelar".
6. **Depois de publicar.** Mostra o link da campanha no Google Ads, o aviso "em análise pelo Google" e o botão **"Pausar"**. A mesma tela lista as campanhas criadas pelo app, com situação e aprovação.

**Configurações (novas):** "Orçamento diário máximo por campanha" e "Orçamento diário máximo total das campanhas criadas pelo app". Os dois começam vazios. Enquanto estiverem vazios, Publicar fica bloqueado.

### Regras da campanha criada
- Somente Rede de Pesquisa: sem Display e sem parceiros de pesquisa.
- Região e idioma iguais aos das campanhas ativas da conta. Se não houver nenhuma campanha ativa com região definida, o formulário pede a região. A região **nunca** vem da IA.
- Lance: "Maximizar conversões" quando a conta teve 15 ou mais conversões nos últimos 30 dias. Caso contrário, "Maximizar cliques" com teto de CPC igual à média da faixa alta de lance das palavras escolhidas (ou R$ 5, se não houver volume).
- Palavras em correspondência de frase ou exata, como recomendado. Nunca ampla.
- Negativas sugeridas entram como negativas da campanha.
- URL final: o domínio principal da conta (a URL final mais usada nos anúncios ativos). Pode ser editada na revisão.

### Fora desta entrega
Editar campanhas depois de criadas (só pausar e reativar), Performance Max e Display, extensões, lances manuais, agendamento de horários e pesquisa automática recorrente.

## 3. Arquitetura

Segue a estrutura atual (`src/api/integracoes`, `src/api/servicos`, `src/app/(app)`).

### 3.1 Integrações
**`ApiGoogleAds`** (`integracoes/google-ads/api-google-ads.ts`) ganha:
- `gerarIdeiasDePalavras(credenciais, { urlSemente, palavrasSemente, idsGeo, idioma })`: usa o `KeywordPlanIdeaService.GenerateKeywordIdeas` e devolve `{ texto, volumeMensal, concorrencia, lanceBaixoMicros, lanceAltoMicros }[]`.
- `mutar(credenciais, operacoes, { somenteValidar })`: usa `mutateResources` atômico com IDs temporários. Com `somenteValidar: true`, vira o ensaio do Google.
- O comentário "somente leitura no MVP" muda: a escrita só é permitida pelo serviço de publicação.

Arquivos novos em `integracoes/google-ads/`:
- `planejador.ts`: mapeadores Zod da resposta do Planejador (enums numéricos ou em texto, como já fazemos).
- `segmentacao.ts`: GAQL das regiões e idiomas das campanhas ativas (`campaign_criterion` LOCATION e LANGUAGE) e do total de conversões em 30 dias.
- `operacoes-de-campanha.ts`: função **pura** que transforma um `RascunhoDeCampanha` na lista de operações (orçamento, campanha, critérios de região e idioma, grupos, palavras, negativas e anúncios RSA).

**`GeradorDeTexto`** (`integracoes/claude/cliente.ts`) ganha:
- `pesquisarNaWeb<T>({ sistema, mensagem, esquema, maxBuscas, maxLeituras })`: usa as ferramentas de servidor de busca e leitura de páginas da Anthropic, com `max_uses`, e saída estruturada validada por Zod. Devolve também quantas buscas foram feitas, para o custo.
- `estimarCustoEmDolares` passa a somar o custo das buscas na web. Os preços vêm da documentação da Anthropic e são conferidos na hora de implementar.

**Fábrica** (`integracoes/fabrica.ts`): no modo demonstração ou em testes, o Planejador, as mutações e a pesquisa na web são falsos. `mutar` de verdade **nunca** é criado com `APP_DADOS_FALSOS=1`, e há teste dessa trava.

### 3.2 Serviços
- `servicos/pesquisa-de-mercado.ts`: orquestra as etapas. Cada etapa lê o estado salvo, executa e grava o resultado. Funções:
  - `iniciarPesquisa(conta)`: monta o ponto de partida.
  - `executarEtapa(pesquisaId, etapa)`: as etapas são `CONCORRENTES`, `SITES`, `VOLUMES` e `RECOMENDACAO`.
  - Na etapa de concorrentes, a IA busca as principais palavras e os nomes de serviço com a região e devolve até 8 domínios, excluindo o da própria conta e marketplaces genéricos.
  - Na etapa de sites, a IA lê até 2 páginas por concorrente e devolve o relatório estruturado com links das fontes.
  - Na etapa de volumes, o Planejador roda com até 10 sementes: os sites dos concorrentes e o próprio site. Sem acesso ao Planejador, a etapa termina com `indisponivel: motivo`.
  - Na etapa de recomendação, uma chamada simples ao Claude, sem web, ordena e explica as palavras. Ela remove as palavras que a conta já usa e só aceita palavras que vieram do Planejador ou, sem Planejador, marca todas como "sem volume".
- `servicos/esquema-pesquisa-de-mercado.ts`: esquemas Zod puros, usados também no navegador.
- `servicos/montagem-de-campanha.ts`: puro. Recebe as palavras escolhidas, a resposta da IA com grupos e textos, a segmentação, o orçamento e o nome, e devolve um `RascunhoDeCampanha`. Usa `filtrarTextosValidos` e os limites já existentes.
- `servicos/travas-de-orcamento.ts`: puro. `verificarOrcamento({ valorDiario, tetoPorCampanha, tetoTotal, somaAtivas })` devolve ok ou o motivo com os números.
- `servicos/campanhas-criadas.ts`: cria o rascunho, valida (ensaio), publica (com trava e idempotência), pausa, reativa e lista com a situação atual (GAQL de `campaign.status` e `ad_group_ad.policy_summary.approval_status`).

### 3.3 Rotas (`src/app/api/`)
| Rota | Função | `maxDuration` |
|---|---|---|
| `POST /api/pesquisa` | iniciar | 30 |
| `POST /api/pesquisa/[id]/etapa` | executar a próxima etapa (ou repetir uma) | 300 |
| `POST /api/campanhas/rascunho` | montar o rascunho a partir da pesquisa | 120 |
| `POST /api/campanhas/rascunho/[id]/validar` | ensaio no Google | 60 |
| `POST /api/campanhas/rascunho/[id]/publicar` | publicar | 60 |
| `POST /api/campanhas/[id]/pausar` e `/reativar` | mudar a situação | 30 |
| `POST /api/configuracao/orcamento` | salvar os tetos | 10 |

Todas exigem sessão e mesma origem, como as rotas atuais.

### 3.4 Banco (Prisma, SQLite local e Postgres na Vercel)
```prisma
/// Pesquisa de mercado de uma conta. etapa: CONCORRENTES | SITES | VOLUMES | RECOMENDACAO | CONCLUIDA
model PesquisaMercado {
  id              String   @id @default(cuid())
  customerId      String
  etapa           String
  pontoDePartidaJson String
  concorrentesJson   String?
  sitesJson          String?
  volumesJson        String?
  recomendacaoJson   String?
  erroEtapa       String?
  custoDolares    Float    @default(0)
  criadoEm        DateTime @default(now())
  @@index([customerId])
}

/// Campanha montada pelo app. situacao: RASCUNHO | PUBLICANDO | ATIVA | PAUSADA | FALHOU
model CampanhaCriada {
  id                 String   @id @default(cuid())
  customerId         String
  pesquisaId         String
  nome               String
  orcamentoDiarioCentavos Int
  rascunhoJson       String
  situacao           String
  campanhaResourceName String?  @unique
  erro               String?
  criadoEm           DateTime @default(now())
  publicadoEm        DateTime?
  @@index([customerId, situacao])
}
```
`Configuracao` ganha `orcamentoMaximoPorCampanhaCentavos Int?` e `orcamentoMaximoTotalCentavos Int?`. Dinheiro é sempre guardado em centavos inteiros e convertido para micros só na operação do Google.

O schema Postgres é gerado de novo pelo script atual, com uma migration nova.

## 4. Segurança

- **Orçamento, região, idioma, conta e URL final nunca vêm da IA.** Vêm do usuário, das Configurações ou da conta. A IA só propõe palavras, grupos, negativas e textos, e tudo passa por esquema e filtros.
- **O conteúdo da web não é confiável.** O prompt marca sites e resultados como dados e proíbe seguir instruções que estejam neles. As saídas são validadas: domínios precisam ser URLs, palavras precisam vir do Planejador e textos precisam caber nos limites.
- **Publicar** confere de novo, no servidor: os tetos, a situação `RASCUNHO` e a conta selecionada. A mudança de `RASCUNHO` para `PUBLICANDO` é feita com `updateMany where situacao = RASCUNHO`. Se nenhuma linha mudar, a requisição devolve a campanha existente. Isso garante idempotência contra clique duplo e recarga da página.
- `somaAtivas` conta as campanhas criadas pelo app com situação `ATIVA` ou `PUBLICANDO`.
- Em demonstração e testes, nunca há mutação real (trava na fábrica, com teste).
- O CSV continua com a proteção contra injeção de fórmula.

## 5. Erros

| Situação | Comportamento |
|---|---|
| Sem `ANTHROPIC_API_KEY` ou chave inválida | A tela avisa o que preencher. A pesquisa não começa. |
| Planejador indisponível (acesso Básico, região) | A etapa termina como `indisponivel` com o motivo. As palavras aparecem "sem volume". Criar campanha pede confirmação extra. |
| Etapa falhou ou excedeu o tempo | O que já foi feito fica salvo, `erroEtapa` é preenchido e aparece o botão "Tentar esta etapa de novo". |
| Site do concorrente não abre | O concorrente fica marcado "não foi possível ler o site". As outras etapas seguem. |
| Limite de buscas ou leituras atingido | A IA fecha com o que tem e o relatório avisa. |
| Tetos não configurados | Publicar fica desativado, com link para Configurações. |
| Valor acima do teto | Recusa com a conta explicada (soma atual, teto e máximo permitido). |
| Ensaio do Google recusou item | A revisão mostra o item e o motivo traduzido (`traduzirErroGoogleAds` ganha erros de política e de mutação). Permite editar ou remover e validar de novo. |
| Falha ao publicar | Nada é criado (operação atômica). A situação volta para `RASCUNHO` com `erro` preenchido. |
| Anúncio reprovado depois | A lista mostra a aprovação, com link para o Google Ads. |
| Pausar falhou | Erro traduzido e link direto para a campanha no Google Ads. |

## 6. Testes

- **Unidade (puros):** `verificarOrcamento` (limites exatos, soma, tetos vazios, centavos); `montarRascunho`/`operacoes-de-campanha` (IDs temporários, frase e exata, nunca ampla, negativas, conversão para micros, sem Display); mapeadores do Planejador; esquemas da pesquisa; filtro de domínios (exclui o próprio e os marketplaces).
- **Integração (Google e Claude falsos, banco de teste):** pesquisa completa etapa por etapa; repetir uma etapa que falhou; Planejador indisponível; publicar acima do teto (recusa); publicar duas vezes (uma campanha só); falha no `mutar` (volta a `RASCUNHO`); pausar e reativar; trava "sem mutação real em demonstração".
- **E2E (Playwright):** o fluxo atual ganha pesquisar → ver concorrentes → marcar palavras → criar campanha → revisar → publicar → pausar, com dados falsos.
- **Manual (conta real, depois do acesso Básico):** rodar uma pesquisa, publicar uma campanha com orçamento baixo (por exemplo R$ 5/dia), conferir no Google Ads que região, idioma, rede e orçamento estão corretos, e pausar.

## 7. Dependências do usuário
- Developer token com acesso **Básico**: necessário para o Planejador e para publicar em contas reais. Hoje está pendente.
- `ANTHROPIC_API_KEY` preenchida (hoje vazia).
- A pesquisa na web precisa estar habilitada na organização da Anthropic (Console → configurações de privacidade), se a conta exigir.

## 8. Ordem de entrega
1. **Parte 1, pesquisa (F6):** integrações de leitura, serviço de etapas, tela e CSV. Já é útil sozinha.
2. **Parte 2, campanha (F7):** configurações de teto, montagem, revisão com ensaio, publicação, pausar e reativar.
