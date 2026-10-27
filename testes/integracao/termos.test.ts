import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/api/banco/prisma";
import type { ApiGoogleAds } from "@/api/integracoes/google-ads/api-google-ads";
import { lerUltimaAnaliseDeTermos, salvarAnaliseDeTermos } from "@/api/servicos/analise-de-termos";
import { carregarAnunciosAvaliados } from "@/api/servicos/anuncios";
import { carregarDadosDosTermos } from "@/api/servicos/dados-de-termos";

function criarApiDeTermos() {
  const gaqls: string[] = [];
  const api: ApiGoogleAds = {
    listarIdsAcessiveis: async () => ["111"],
    gerarIdeiasDePalavras: async () => ({ results: [] }),
    consultar: async (_c, gaql) => {
      gaqls.push(gaql);
      if (gaql.includes("FROM search_term_view")) {
        return [
          { search_term_view: { search_term: "sofá grátis", status: 5 }, ad_group: { id: 10, name: "Sofás" }, campaign: { name: "Pesquisa" }, metrics: { clicks: 4, cost_micros: 20_000_000 } },
          { search_term_view: { search_term: "sofá cama", status: 5 }, ad_group: { id: 10, name: "Sofás" }, campaign: { name: "Pesquisa" }, metrics: { clicks: 9, cost_micros: 30_000_000, conversions: 2 } },
          { search_term_view: { search_term: "sofá retrátil", status: 2 }, ad_group: { id: 10, name: "Sofás" }, campaign: { name: "Pesquisa" }, metrics: { clicks: 20, cost_micros: 90_000_000, conversions: 5 } },
        ];
      }
      if (gaql.includes("FROM ad_group_criterion")) return [{ ad_group: { id: 10 }, ad_group_criterion: { keyword: { text: "sofá retrátil" } } }];
      return [];
    },
  };
  return { api, gaqls };
}

const base = { credenciais: { customerId: "111", loginCustomerId: "111", refreshToken: "rt" }, periodo: 30 as const, hoje: new Date(2026, 9, 15) };

beforeEach(async () => {
  await prisma.cacheConsulta.deleteMany({});
  await prisma.sugestao.deleteMany({});
});
afterAll(async () => {
  await prisma.cacheConsulta.deleteMany({});
  await prisma.sugestao.deleteMany({});
  await prisma.$disconnect();
});

describe("carregarDadosDosTermos", () => {
  it("monta termos (do mais caro), gasto sem conversão e as sugestões por regra", async () => {
    const { api } = criarApiDeTermos();
    const dados = await carregarDadosDosTermos({ ...base, api });
    expect(dados.termos.map((t) => t.termo)).toEqual(["sofá retrátil", "sofá cama", "sofá grátis"]);
    expect(dados.gastoSemConversao).toBeCloseTo(20);
    expect(dados.negativasPorRegra.map((n) => n.termo)).toEqual(["sofá grátis"]);
    expect(dados.novasPorRegra.map((n) => [n.texto, n.correspondencia])).toEqual([["sofá cama", "Exata"]]);
  });

  it("reaproveita o cache das palavras dos grupos já buscado pela tela de anúncios", async () => {
    const { api, gaqls } = criarApiDeTermos();
    await carregarAnunciosAvaliados({ ...base, api });
    const antes = gaqls.length;
    await carregarDadosDosTermos({ ...base, api });
    expect(gaqls.slice(antes)).toHaveLength(1);
    expect(gaqls.at(-1)).toContain("search_term_view");
  });
});

describe("análise de termos salva", () => {
  it("guarda e lê a última análise da conta", async () => {
    expect(await lerUltimaAnaliseDeTermos("111")).toBeNull();
    const resultado = {
      negativas: [
        { termo: "sofá grátis", correspondencia: "Exata" as const, grupoId: "10", grupoNome: "Sofás", campanhaNome: "Pesquisa", custo: 20, cliques: 4, motivo: "Gratuito.", origem: "ia" as const },
      ],
      novas: [],
      modelo: "claude-opus-5-5",
      tokensEntrada: 1000,
      tokensSaida: 500,
      custoEstimadoEmDolares: 0.014,
    };
    await salvarAnaliseDeTermos({ customerId: "111", contextoUsuario: "primeira", resultado });
    await new Promise((r) => setTimeout(r, 5));
    await salvarAnaliseDeTermos({ customerId: "111", contextoUsuario: "segunda", resultado });
    await salvarAnaliseDeTermos({ customerId: "222", contextoUsuario: "outra conta", resultado });

    const ultima = await lerUltimaAnaliseDeTermos("111");
    expect(ultima).toMatchObject({ contextoUsuario: "segunda", modelo: "claude-opus-5-5" });
    expect(ultima?.negativas[0]?.termo).toBe("sofá grátis");
    expect(ultima?.custoEstimadoEmDolares).toBeCloseTo(0.014);
  });
});
