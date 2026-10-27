import { describe, expect, it } from "vitest";
import { analisarTermosComIa } from "@/api/servicos/analise-de-termos";
import { gerarSugestoesDeTitulos } from "@/api/servicos/sugestoes";
import { listarContasAcessiveis } from "@/api/integracoes/google-ads/contas";
import { mapearLinhasDeTermo, montarGaqlDeTermos } from "@/api/integracoes/google-ads/termos";
import { mapearLinhasDeAnuncioRsa, GAQL_ANUNCIOS_RSA, GAQL_PALAVRAS_DOS_GRUPOS, mapearPalavrasPorGrupo } from "@/api/integracoes/google-ads/anuncios";
import { modoDemonstracaoAtivo } from "@/api/integracoes/fabrica";
import { ID_MCC_DEMO, RESPOSTAS_DA_IA_DE_DEMONSTRACAO, responderConsultaDeDemonstracao } from "@/api/integracoes/demonstracao/dados";
import type { GeradorDeTexto } from "@/api/integracoes/claude/cliente";

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
