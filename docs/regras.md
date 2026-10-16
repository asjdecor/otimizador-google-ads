# Regras de desenvolvimento

> Dono: agente `arquiteto` · Atualizado: 2026-10-15 · Vale para humanos e agentes de IA.

## 1. Como o código é escrito
- TypeScript em modo estrito (`"strict": true`), **sem `any`**. Quando o tipo for desconhecido, use `unknown` e valide com Zod.
- O nome da função diz o que ela faz: `calcularNotaDoAnuncio`, `buscarTermosDePesquisa`, `gerarSugestoesDeTitulos`. Nada de `processar`, `handle` ou `util`.
- Código e nomes de domínio em português; termos técnicos consagrados (`client`, `handler`, `prompt`) podem ficar em inglês.
- **Todo ajuste vem com teste.** Regras de negócio (nota, desperdício, limites de caracteres) têm teste de unidade com casos de borda.
- Mudança pequena, um assunto por vez: uma tarefa do `tarefas.md` por commit/PR.
- Funções de regra são puras sempre que possível: recebem dados e devolvem dados, sem I/O.
- Chamadas externas só em `src/api/integracoes/`. Nos testes, use integrações falsas; **nenhum teste chama o Google Ads ou o Claude de verdade**.
- Toda entrada de rota e toda saída da IA passam por um schema Zod.
- Valores de dinheiro do Google Ads vêm em *micros*: converta em um único lugar (`microsParaReais`).
- Erros mostram ao usuário o que fazer ("Token expirado — reconecte a conta"), nunca um stack trace.
- Segredos só em `.env`. Refresh token sempre criptografado. Nada sensível nos logs.

## 2. O que o agente NÃO mexe
- **Não** alterar migration que já rodou (em produção ou no banco local com dados). Para mudar algo, crie uma migration nova.
- **Não** instalar dependência nova sem perguntar ao usuário. As dependências já aprovadas estão em `arquitetura.md` § 2.
- **Não** apagar nem desativar (`skip`) teste que está falhando. Corrija a causa.
- **Não** chamar mutações da API do Google Ads no MVP (o app é somente leitura).
- **Não** alterar `prd.md`, `arquitetura.md` ou `design.md` sem aprovação do agente dono.
- **Não** commitar `.env`, tokens ou chaves.
- **Banco:** edite só `prisma/schema.prisma` (SQLite). Toda mudança de modelo exige: `npm run db:migrate` (SQLite), `npm run db:schema-postgres` e uma migration nova em `prisma/postgres/migrations/` (`prisma migrate diff --from-schema-datamodel <anterior> --to-schema-datamodel prisma/postgres/schema.prisma --script`). O teste `schema-postgres` (e o `vercel-build`) falha se o schema Postgres não for regenerado; a migration Postgres **não** é checada automaticamente, então não esqueça dela.
- **Login:** toda tela nova vai dentro de `src/app/(app)/`. Nada fora desse grupo pode ler dados da conta, exceto `/login`, que é público.

## 3. Estrutura
- Telas em `src/app/`, regras em `src/api/`, componentes em `src/componentes/`, testes em `testes/`. **Nada solto na raiz** além de arquivos de configuração.
- Route Handlers (`src/app/api/**/route.ts`) têm no máximo cerca de 30 linhas: validar, chamar o serviço, responder.
- Um arquivo por assunto. Se passar de cerca de 300 linhas, divida.
- Testes espelham o caminho do código: `src/api/servicos/diagnostico.ts` é testado em `testes/unidade/servicos/diagnostico.test.ts`.
- Antes de marcar uma tarefa como Feita: `npm run lint`, `npm run typecheck` e `npm test` passam.
