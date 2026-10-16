# PRD — Otimizador de Anúncios Google Ads

> Dono: agente `produto` · Atualizado: 2026-10-15

## 1. Visão
Um app pessoal que se conecta à conta do Google Ads, mostra onde a verba está sendo desperdiçada, dá nota a cada anúncio e gera, com IA (Claude), versões melhores de títulos, descrições e palavras-chave, prontas para copiar para o Google Ads.

## 2. Problema
- Os relatórios do Google Ads trazem muitos números, mas não dizem **o que mudar**.
- Achar anúncios com CTR baixo, palavras-chave caras e sem conversão ou termos de pesquisa irrelevantes leva horas de planilha.
- Escrever variações de anúncios RSA (até 15 títulos de 30 caracteres e 4 descrições de 90) é trabalhoso, e é fácil estourar o limite ou esquecer o CTA.

## 3. Público
- **Usuário único:** o dono do app, que gerencia campanhas próprias e/ou de clientes, de qualquer nicho.
- Pode ter várias contas de anúncio, acessadas direto ou por uma conta gerente (MCC).
- Conhece o básico do Google Ads, mas não quer passar horas analisando relatórios.
- Não há cadastro de outros usuários. O único login é o OAuth do Google.

## 4. Funcionalidades (MVP)
Regra do MVP: o app **só lê** dados da conta e **sugere** mudanças. Nenhuma alteração é enviada ao Google Ads.

### F1. Conexão
- F1.1 O usuário consegue conectar sua conta Google pelo OAuth e ver a lista de contas de anúncio acessíveis, incluindo as filhas de uma MCC.
- F1.2 O usuário consegue escolher qual conta analisar e trocar de conta sem refazer o login.
- F1.3 O usuário consegue desconectar a conta. Ao desconectar, o token salvo é apagado do banco.

### F2. Análise de métricas
- F2.1 O usuário consegue escolher um período (últimos 7, 30 ou 90 dias) e ver por campanha: impressões, cliques, CTR, CPC médio, custo, conversões e custo por conversão.
- F2.2 O usuário consegue ver a lista de **palavras-chave que desperdiçam verba**: custo acima de um valor configurável (padrão R$ 50) no período e 0 conversões, ordenada por custo.
- F2.3 O usuário consegue ver a lista de **anúncios com CTR abaixo da média** do seu grupo de anúncios: CTR menor que 70% da média do grupo e pelo menos 100 impressões.
- F2.4 O usuário consegue ver um resumo no topo do painel com o total gasto em palavras-chave sem conversão no período.

### F3. Nota e diagnóstico do anúncio
- F3.1 O usuário consegue abrir um anúncio RSA e ver uma nota de 0 a 100 calculada por regras fixas e explicadas.
- F3.2 O diagnóstico aponta, para cada regra violada, o problema e como corrigir. As regras do MVP são:
  - menos de 10 títulos ou menos de 4 descrições;
  - título acima de 30 ou descrição acima de 90 caracteres;
  - nenhuma palavra-chave do grupo aparece em pelo menos 1 título;
  - nenhum título ou descrição tem chamada para ação (lista de verbos: compre, peça, solicite, ligue, agende, garanta, saiba, confira…);
  - títulos duplicados ou quase iguais (mesmo texto ignorando maiúsculas e acentos);
  - Força do anúncio (ad strength) do Google "Ruim" ou "Média", quando a API informar.
- F3.3 O usuário consegue ver, ao lado da nota, as métricas do anúncio no período (CTR, conversões).

### F4. Reescrita com IA
- F4.1 O usuário consegue clicar em "Gerar sugestões" num anúncio e receber de 10 a 15 títulos novos e 4 descrições novas, geradas pelo Claude com base no texto atual, nas palavras-chave do grupo e na URL final.
- F4.2 Toda sugestão exibida respeita o limite (título ≤ 30, descrição ≤ 90). Sugestões que estourarem são descartadas ou geradas de novo antes de aparecer.
- F4.3 O usuário consegue informar um contexto opcional (diferencial, oferta, tom de voz) antes de gerar.
- F4.4 O usuário consegue copiar um texto ou todos de uma vez com um clique.
- F4.5 O usuário consegue ver o histórico de sugestões geradas para cada anúncio.

### F5. Palavras-chave
- F5.1 O usuário consegue ver os termos de pesquisa do período, com cliques, custo e conversões.
- F5.2 O usuário consegue ver **sugestões de palavras-chave negativas**: termos com custo e sem conversão, mais os termos que a IA marcar como irrelevantes para o negócio, cada um com o motivo.
- F5.3 O usuário consegue ver **sugestões de novas palavras-chave**: termos de pesquisa que converteram e ainda não são palavras-chave, mais variações sugeridas pela IA, cada uma com o tipo de correspondência sugerido.
- F5.4 O usuário consegue exportar as listas de negativas e de novas palavras-chave em CSV.

## 5. Desejáveis (fase 2, fora do MVP)
- Aplicar sugestões direto na conta pela API: criar anúncio, adicionar negativas, pausar palavra-chave, sempre com confirmação.
- Testes A/B acompanhados (sugestão aplicada vs. original, comparação de CTR depois de N dias).
- Alertas por e-mail quando o desperdício passar de um limite.
- Relatório em PDF para enviar a clientes.
- Análise de campanhas de Performance Max e Display.

## 6. Fora do escopo
- Múltiplos usuários, cadastro, planos ou pagamento (não é um SaaS).
- Criar campanhas do zero.
- Gestão de lances e orçamento.
- Outras plataformas (Meta Ads, TikTok, Microsoft Ads).
- App mobile nativo (a versão web deve funcionar no celular).

## 7. Critérios de sucesso
- Conectar a conta e ver o painel de métricas em menos de 2 minutos no primeiro uso.
- As métricas do painel batem com a interface do Google Ads para o mesmo período (diferença ≤ 1%).
- 100% das sugestões exibidas respeitam os limites de caracteres (há teste automatizado).
- Gerar sugestões de um anúncio leva menos de 20 segundos.
- Em 30 dias de uso, o custo de palavras-chave sem conversão cai pelo menos 20% nas contas analisadas.

## 8. Riscos
| Risco | Impacto | Mitigação |
|---|---|---|
| O **developer token** do Google Ads precisa de aprovação. O acesso de teste só funciona com contas de teste. | Alto: sem acesso Básico, não dá para ler contas reais. | Pedir o acesso Básico no início do projeto e desenvolver com conta de teste enquanto aguarda. |
| Custo da API do Claude | Médio | Gerar só quando o usuário clicar, guardar as sugestões no banco e mostrar o custo estimado por geração. |
| Token OAuth vazar | Alto | Refresh token criptografado no banco, app rodando localmente e nunca exposto sem senha. |
| Cotas e limites da API do Google Ads | Médio | Cache das consultas por conta e período (15 min) e botão "Atualizar". |
| IA sugerir afirmações falsas, como preço ou garantia | Médio | O prompt proíbe inventar ofertas; o contexto do usuário é a única fonte para promoções. Aviso na tela: "revise antes de publicar". |
| Mudanças na versão da API do Google Ads | Baixo | Isolar todas as chamadas num único módulo de integração. |
