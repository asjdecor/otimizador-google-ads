import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/api/banco/prisma";
import type { ApiGoogleAds } from "@/api/integracoes/google-ads/api-google-ads";
import {
  carregarAnuncioAvaliado,
  carregarAnunciosAvaliados,
  idDoAnuncioEhValido,
  montarIdDoAnuncio,
} from "@/api/servicos/anuncios";
import { carregarDadosDoPainel } from "@/api/servicos/painel";

const titulos = (prefixo: string, n: number) => Array.from({ length: n }, (_, i) => ({ text: `${prefixo} ${i + 1}` }));

function criarApiDeAnuncios() {
  const gaqls: string[] = [];
  const api: ApiGoogleAds = {
    listarIdsAcessiveis: async () => ["111"],
    consultar: async (_c, gaql) => {
      gaqls.push(gaql);
      if (gaql.includes("RESPONSIVE_SEARCH_AD")) {
        return [
          {
            ad_group_ad: {
              ad: {
                id: 1,
                responsive_search_ad: {
                  headlines: [{ text: "Sofá Retrátil Sob Medida" }, { text: "Peça Seu Orçamento" }, ...titulos("Título", 8)],
                  descriptions: titulos("Descrição", 4),
                },
              },
              ad_strength: 7,
            },
            ad_group: { id: 10, name: "Sofás" },
            campaign: { name: "Pesquisa" },
          },
          {
            ad_group_ad: { ad: { id: 2, responsive_search_ad: { headlines: [{ text: "Móveis" }], descriptions: [] } }, ad_strength: 4 },
            ad_group: { id: 10, name: "Sofás" },
            campaign: { name: "Pesquisa" },
          },
        ];
      }
      if (gaql.includes("FROM ad_group_criterion")) {
        return [{ ad_group: { id: 10 }, ad_group_criterion: { keyword: { text: "sofá retrátil" } } }];
      }
      if (gaql.includes("FROM ad_group_ad")) {
        return [{ ad_group_ad: { ad: { id: 1 } }, ad_group: { id: 10 }, metrics: { impressions: 1000, clicks: 50, cost_micros: 25_000_000 } }];
      }
      return [];
    },
  };
  return { api, gaqls };
}

const base = { credenciais: { customerId: "111", loginCustomerId: "111", refreshToken: "rt" }, periodo: 30 as const, hoje: new Date(2026, 9, 15) };

beforeEach(() => prisma.cacheConsulta.deleteMany({}));
afterAll(async () => {
  await prisma.cacheConsulta.deleteMany({});
  await prisma.$disconnect();
});

describe("id do anúncio na URL", () => {
  it("monta e valida grupo~anuncio", () => {
    expect(montarIdDoAnuncio("10", "1")).toBe("10~1");
    expect(idDoAnuncioEhValido("10~1")).toBe(true);
    expect(idDoAnuncioEhValido("10-1")).toBe(false);
    expect(idDoAnuncioEhValido("abc~1")).toBe(false);
    expect(idDoAnuncioEhValido("10~1~2")).toBe(false);
  });
});

describe("carregarAnunciosAvaliados", () => {
  it("dá nota, junta métricas e ordena da pior para a melhor", async () => {
    const { api } = criarApiDeAnuncios();
    const { anuncios } = await carregarAnunciosAvaliados({ ...base, api });

    expect(anuncios.map((a) => a.id)).toEqual(["10~2", "10~1"]);
    const [ruim, bom] = anuncios;
    expect(bom?.diagnostico.nota).toBe(100);
    expect(bom?.metricas).toMatchObject({ impressoes: 1000, cliques: 50, custo: 25 });
    expect(bom?.metricas?.ctr).toBeCloseTo(0.05);
    expect(bom?.palavrasDoGrupo).toEqual(["sofá retrátil"]);
    expect(ruim?.diagnostico.classificacao).toBe("Ruim");
    expect(ruim?.metricas).toBeNull();
  });

  it("reaproveita o cache de métricas de anúncios que o painel já buscou", async () => {
    const { api, gaqls } = criarApiDeAnuncios();
    await carregarDadosDoPainel({ ...base, api, limiteDesperdicio: 50 });
    const antes = gaqls.length;
    await carregarAnunciosAvaliados({ ...base, api });
    // só as 2 consultas novas (RSA + palavras dos grupos); métricas de anúncios vieram do cache
    expect(gaqls.length - antes).toBe(2);
  });
});

describe("carregarAnuncioAvaliado", () => {
  it("encontra pelo id", async () => {
    const { api } = criarApiDeAnuncios();
    const { anuncio } = await carregarAnuncioAvaliado("10~1", { ...base, api });
    expect(anuncio?.anuncio.titulos[0]).toBe("Sofá Retrátil Sob Medida");
  });

  it("id inexistente devolve null; id inválido nem consulta o Google", async () => {
    const { api, gaqls } = criarApiDeAnuncios();
    expect((await carregarAnuncioAvaliado("../etc", { ...base, api })).anuncio).toBeNull();
    expect(gaqls).toHaveLength(0);
    expect((await carregarAnuncioAvaliado("10~999", { ...base, api })).anuncio).toBeNull();
  });
});
