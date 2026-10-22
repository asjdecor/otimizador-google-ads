# Tarefas

> Dono: agente `planejador` · Atualizado: 2026-10-15
> Status: Pendente / Em andamento / Feita · Cada tarefa cabe em uma sessão e tem resultado verificável.

## Fase 0 — Pré-requisitos (usuário, fora do código)
| Tarefa | Prioridade | Status |
|---|---|---|
| Criar projeto no Google Cloud, ativar Google Ads API e criar credencial OAuth (Client ID/Secret, redirect `http://localhost:3000/api/auth/google/callback`) | Alta | Pendente |
| Confirmar no Google Cloud se a Google Ads API está ativada e se o projeto tem nível de acesso Explorer ou superior para contas reais | Alta | Pendente |
| Criar uma conta de teste do Google Ads para desenvolver enquanto o projeto só tiver acesso Test | Alta | Pendente |
| Criar chave da API Anthropic | Alta | Pendente |

## Fase 1 — Base
| Tarefa | Prioridade | Status |
|---|---|---|
| Criar projeto Next.js + TS estrito + Tailwind + ESLint + Vitest, com a estrutura de pastas da arquitetura; `npm test` roda 1 teste de exemplo | Alta | Feita |
| Prisma + SQLite + migration inicial (5 tabelas) + `.env.example` | Alta | Feita |
| Tokens de design no Tailwind (cores, fonte Inter) + layout com menu e topo | Alta | Feita |
| Componentes base: BotaoConfirmar, BotaoVoltar, BotaoCancelar, CampoTexto (com os 4 estados) + testes | Média | Feita |
| Módulo `seguranca/criptografia` (AES-256-GCM): criptografar e descriptografar com teste | Alta | Feita |

## Fase 2 — Conexão Google Ads (F1)
| Tarefa | Prioridade | Status |
|---|---|---|
| Fluxo OAuth: rota de início + callback, salvando o refresh token criptografado | Alta | Feita |
| Integração Google Ads: cliente + `listarContasAcessiveis` (incluindo filhas da MCC) com mock nos testes | Alta | Feita |
| Tela Conectar + SeletorConta + desconectar (apaga o token) | Alta | Feita |
| Cache de consultas (15 min) + botão "Atualizar" | Média | Feita |
| Teste manual com a conta real: conectar, ver contas, trocar conta, desconectar (precisa das chaves no .env) | Alta | Pendente |

## Fase 3 — Métricas e desperdício (F2)
| Tarefa | Prioridade | Status |
|---|---|---|
| Consulta GAQL de métricas por campanha + `microsParaReais` + teste do mapeador | Alta | Feita |
| Serviço `encontrarPalavrasChaveQueDesperdicam` (regra do limite configurável) + testes de borda | Alta | Feita |
| Serviço `encontrarAnunciosComCtrBaixo` (< 70% da média do grupo, ≥ 100 impressões) + testes | Alta | Feita |
| Tela Painel: SeletorPeriodo, CardMetrica, TabelaDados de campanhas, desperdício total | Alta | Feita |

## Fase 4 — Nota e diagnóstico (F3)
| Tarefa | Prioridade | Status |
|---|---|---|
| Consulta GAQL de anúncios RSA (títulos, descrições, ad strength, URL) + palavras-chave do grupo | Alta | Feita |
| Função pura `calcularNotaDoAnuncio` com as 6 regras do PRD + 1 teste por regra | Alta | Feita |
| Tela do anúncio: SeloNota, lista de ItemDiagnostico, métricas do anúncio | Alta | Feita |

## Fase 5 — Reescrita com IA (F4)
| Tarefa | Prioridade | Status |
|---|---|---|
| Integração Claude: cliente + saída JSON validada por Zod (mock nos testes) | Alta | Feita |
| Serviço `gerarSugestoesDeTitulos`: prompt, filtro de limite (30/90) e até 2 novas tentativas + teste "nenhuma sugestão acima do limite" | Alta | Feita |
| Tela: campo de contexto, BotaoConfirmar, ItemSugestao com contador, copiar um/todos, AvisoRevisao | Alta | Feita |
| Salvar sugestões no banco + histórico por anúncio + tokens usados | Média | Feita |
| Teste manual: gerar sugestões num anúncio real e conferir qualidade e custo (precisa de ANTHROPIC_API_KEY) | Alta | Pendente |

## Fase 6 — Palavras-chave (F5)
| Tarefa | Prioridade | Status |
|---|---|---|
| Consulta GAQL de termos de pesquisa + tela com TabelaDados | Alta | Feita |
| Serviço de negativas: regra (custo sem conversão) + classificação de irrelevância pela IA, com motivo | Alta | Feita |
| Serviço de novas palavras: termos que converteram e não são palavras-chave + variações da IA com tipo de correspondência | Média | Feita |
| Exportar negativas e novas palavras em CSV | Média | Feita |
| Teste manual: conferir termos, rodar a análise com IA e importar um CSV no Google Ads Editor | Alta | Pendente |

## Fase 7 — Fechamento do MVP
| Tarefa | Prioridade | Status |
|---|---|---|
| Teste e2e (Playwright) com Google Ads e Claude falsos: login → conectar → painel → anúncio → sugestões → palavras-chave → CSV → desconectar | Média | Feita |
| Conferir métricas com a interface do Google Ads (critério ≤ 1%) numa conta real | Alta | Pendente |
| README de como rodar (inclui modo de demonstração e publicação na Vercel) | Baixa | Feita |

## Fase 8 — Publicação online (PRD § 4.1)
| Tarefa | Prioridade | Status |
|---|---|---|
| Repositório público no GitHub (github.com/asjdecor/otimizador-google-ads), sem segredos | Alta | Feita |
| **Usuário:** escolher hospedagem → **Vercel** (escolhido em 2026-10-15) | Alta | Feita |
| **Usuário:** criar conta na Vercel, importar o repositório, adicionar Neon e as variáveis (passo a passo no README) | Alta | Pendente |
| **Usuário:** informar o domínio (ou usar o endereço `.vercel.app` por enquanto) | Média | Pendente |
| Login do app: senha única do dono (hash no `.env`), sessão em cookie httpOnly assinado, middleware protegendo todas as telas e rotas | Alta | Feita |
| PostgreSQL na Vercel: schema gerado + migration `0_inicial` + script `vercel-build` (local/testes seguem em SQLite) | Alta | Feita |
| Configurar variáveis na hospedagem + redirect OAuth `https://<domínio>/api/auth/google/callback` no Google Cloud | Alta | Pendente |
| Apontar o domínio (DNS) para a hospedagem e testar ponta a ponta | Média | Pendente |
