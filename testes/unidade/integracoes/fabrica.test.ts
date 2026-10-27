import { describe, expect, it } from "vitest";
import { analisarTermosComIa, esquemaRespostaDeAnalise } from "@/api/servicos/analise-de-termos";
import { gerarSugestoesDeTitulos } from "@/api/servicos/sugestoes";
import { listarContasAcessiveis } from "@/api/integracoes/google-ads/contas";
import { mapearLinhasDeTermo, montarGaqlDeTermos } from "@/api/integracoes/google-ads/termos";
import { mapearLinhasDeAnuncioRsa, GAQL_ANUNCIOS_RSA, GAQL_PALAVRAS_DOS_GRUPOS, mapearPalavrasPorGrupo } from "@/api/integracoes/google-ads/anuncios";
import { mapearIdeiasDePalavras } from "@/api/integracoes/google-ads/planejador";
import { filtrarRecomendacoes } from "@/api/servicos/filtros-da-pesquisa";
import { modoDemonstracaoAtivo } from "@/api/integracoes/fabrica";
import { ID_MCC_DEMO, IDEIAS_DE_DEMONSTRACAO, RESPOSTAS_DA_IA_DE_DEMONSTRACAO, responderConsultaDeDemonstracao } from "@/api/integracoes/demonstracao/dados";
import type { GeradorDeTexto } from "@/api/integracoes/claude/cliente";
import { esquemaRespostaConcorrentes, esquemaRespostaRecomendacao, esquemaRespostaSites } from "@/api/servicos/esquema-pesquisa-de-mercado";
import { esquemaRespostaDeSugestoes } from "@/api/servicos/sugestoes";

describe("modoDemonstracaoAtivo (trava de segurança)", () => {
  it("só liga com APP_DADOS_FALSOS=1 fora de produção", () => {
    expect(modoDemonstracaoAtivo({ APP_DADOS_FALSOS: "1", NODE_ENV: "development" })).toBe(true);
    expect(modoDemonstracaoAtivo({ APP_DADOS_FALSOS: "1", NODE_ENV: "test" })).toBe(true);
  });

  it("nunca liga em produção nem na Vercel, nem sem a variável", () => {
    expect(modoDemonstracaoAtivo({ APP_DADOS_FALSOS: "1", NODE_ENV: "production" })).toBe(false);
    expect(modoDemonstracaoAtivo({ APP_DADOS_FALSOS: "1", NODE_ENV: "development", VERCEL: "1" })).toBe(false);
    expect(modoDemonstracaoAtivo({ NODE_ENV: "development" })).toBe(false);
    expect(modoDemonstracaoAtivo({ APP_DADOS_FALSOS: "true", NODE_ENV: "development" })).toBe(false);
  });
});

describe("dados de demonstração passam pelos mesmos mapeadores do app real", () => {
  it("contas: MCC + 2 contas de anúncios", async () => {
    const api = { listarIdsAcessiveis: async () => [ID_MCC_DEMO], consultar: async (_c: unknown, g: string) => responderConsultaDeDemonstracao(g), gerarIdeiasDePalavras: async () => ({}) };
    const contas = await listarContasAcessiveis(api, "rt");
    expect(contas.filter((c) => !c.ehGerente)).toHaveLength(2);
  });

  it("anúncios, palavras e termos são lidos sem perder linhas", () => {
    expect(mapearLinhasDeAnuncioRsa(responderConsultaDeDemonstracao(GAQL_ANUNCIOS_RSA))).toHaveLength(2);
    expect(Object.keys(mapearPalavrasPorGrupo(responderConsultaDeDemonstracao(GAQL_PALAVRAS_DOS_GRUPOS)))).toHaveLength(2);
    const termos = mapearLinhasDeTermo(responderConsultaDeDemonstracao(montarGaqlDeTermos({ inicio: "2026-01-01", fim: "2026-01-31" })));
    expect(termos).toHaveLength(5);
  });

  it("as respostas da IA de demonstração servem para sugestões e para análise de termos", async () => {
    const gerador: GeradorDeTexto = {
      async gerarJson(pedido) {
        for (const r of RESPOSTAS_DA_IA_DE_DEMONSTRACAO) {
          const lido = pedido.esquema.safeParse(r);
          if (lido.success) return { dados: lido.data, modelo: "demonstracao", tokensEntrada: 0, tokensSaida: 0 };
        }
        throw new Error("sem resposta");
      },
      pesquisarNaWeb: async () => {
        throw new Error("não usado aqui");
      },
    };
    const [anuncio] = mapearLinhasDeAnuncioRsa(responderConsultaDeDemonstracao(GAQL_ANUNCIOS_RSA));
    const sugestoes = await gerarSugestoesDeTitulos(gerador, { anuncio: anuncio!, palavrasDoGrupo: ["sofá retrátil"] });
    expect(sugestoes.incompleto).toBe(false);

    const termos = mapearLinhasDeTermo(responderConsultaDeDemonstracao("FROM search_term_view"));
    const analise = await analisarTermosComIa(gerador, { termos, palavrasPorGrupo: { "10": ["sofá retrátil"] } });
    expect(analise.negativas.map((n) => n.termo)).toEqual(["sofá grátis doação", "conserto de sofá"]);
  });
});

describe("cada esquema recebe exatamente uma resposta de demonstração (a certa)", () => {
  const esquemas = [
    { nome: "sugestões", esquema: esquemaRespostaDeSugestoes, indice: 0 },
    { nome: "análise de termos", esquema: esquemaRespostaDeAnalise, indice: 1 },
    { nome: "concorrentes", esquema: esquemaRespostaConcorrentes, indice: 2 },
    { nome: "relatórios dos sites", esquema: esquemaRespostaSites, indice: 3 },
    { nome: "recomendação", esquema: esquemaRespostaRecomendacao, indice: 4 },
  ];

  for (const { nome, esquema, indice } of esquemas) {
    it(`${nome}: só a resposta ${indice} passa`, () => {
      const quePassam = RESPOSTAS_DA_IA_DE_DEMONSTRACAO.map((r, i) => (esquema.safeParse(r).success ? i : -1)).filter((i) => i >= 0);
      expect(quePassam).toEqual([indice]);
    });
  }

  it("a recomendação de demonstração mantém pelo menos 3 palavras e descarta as que devem cair", () => {
    const resposta = RESPOSTAS_DA_IA_DE_DEMONSTRACAO.map((r) => esquemaRespostaRecomendacao.safeParse(r)).find((l) => l.success)?.data;
    expect(resposta).toBeDefined();
    const palavrasDaConta = (responderConsultaDeDemonstracao(GAQL_PALAVRAS_DOS_GRUPOS) as { ad_group_criterion: { keyword: { text: string } } }[]).map(
      (l) => l.ad_group_criterion.keyword.text,
    );
    const volumes = { disponivel: true as const, ideias: mapearIdeiasDePalavras({ results: IDEIAS_DE_DEMONSTRACAO }) };
    const { recomendadas, negativas } = filtrarRecomendacoes(resposta!, volumes, palavrasDaConta);
    const textos = recomendadas.map((p) => p.texto);
    expect(recomendadas.length).toBeGreaterThanOrEqual(3);
    expect(textos).not.toContain("sofá retrátil");
    expect(textos).not.toContain("sofá espacial inexistente");
    expect(recomendadas.every((p) => p.volumeMensal !== null)).toBe(true);
    expect(negativas.length).toBeGreaterThan(0);
  });

  it("a demonstração tem 3 concorrentes .example, um deles o próprio site", () => {
    const { concorrentes } = esquemaRespostaConcorrentes.parse(RESPOSTAS_DA_IA_DE_DEMONSTRACAO[2]);
    expect(concorrentes).toHaveLength(3);
    expect(concorrentes.every((c) => c.site.includes(".example"))).toBe(true);
    expect(concorrentes.some((c) => c.site.includes("sofas-demo.example"))).toBe(true);
  });
});

describe("urlDoBancoParaOAmbiente (demonstração nunca grava no banco real)", () => {
  it("troca dados.db por demo.db no modo demonstração", async () => {
    const { urlDoBancoParaOAmbiente, BANCO_DA_DEMONSTRACAO } = await import("@/api/configuracao/demonstracao");
    expect(urlDoBancoParaOAmbiente({ APP_DADOS_FALSOS: "1", NODE_ENV: "development", DATABASE_URL: "file:./dados.db" })).toBe(BANCO_DA_DEMONSTRACAO);
  });

  it("mantém o banco quando não é demonstração ou já é outro banco", async () => {
    const { urlDoBancoParaOAmbiente } = await import("@/api/configuracao/demonstracao");
    expect(urlDoBancoParaOAmbiente({ NODE_ENV: "development", DATABASE_URL: "file:./dados.db" })).toBeNull();
    expect(urlDoBancoParaOAmbiente({ APP_DADOS_FALSOS: "1", NODE_ENV: "development", DATABASE_URL: "file:./e2e.db" })).toBeNull();
    expect(urlDoBancoParaOAmbiente({ APP_DADOS_FALSOS: "1", NODE_ENV: "production", DATABASE_URL: "file:./dados.db" })).toBeNull();
  });
});

describe("usarIaReal (demonstração não gasta créditos sem pedir)", () => {
  it("fora da demonstração, a IA é sempre a real", async () => {
    const { usarIaReal } = await import("@/api/configuracao/demonstracao");
    expect(usarIaReal({ NODE_ENV: "development" })).toBe(true);
    expect(usarIaReal({ NODE_ENV: "production", APP_DADOS_FALSOS: "1" })).toBe(true);
  });

  it("na demonstração, só usa a IA real com APP_DEMO_IA_REAL=1", async () => {
    const { usarIaReal } = await import("@/api/configuracao/demonstracao");
    expect(usarIaReal({ NODE_ENV: "development", APP_DADOS_FALSOS: "1" })).toBe(false);
    expect(usarIaReal({ NODE_ENV: "development", APP_DADOS_FALSOS: "1", APP_DEMO_IA_REAL: "1" })).toBe(true);
    expect(usarIaReal({ NODE_ENV: "development", APP_DADOS_FALSOS: "1", APP_DEMO_IA_REAL: "true" })).toBe(false);
  });
});
