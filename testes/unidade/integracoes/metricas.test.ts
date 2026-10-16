import { describe, expect, it } from "vitest";
import {
  mapearLinhasDeAnuncio,
  mapearLinhasDeCampanha,
  mapearLinhasDePalavraChave,
  microsParaReais,
  montarGaqlDeAnuncios,
  montarGaqlDeCampanhas,
  montarGaqlDePalavrasChave,
} from "@/api/integracoes/google-ads/metricas";

const intervalo = { inicio: "2026-09-15", fim: "2026-10-14" };

describe("microsParaReais", () => {
  it("converte micros sem arredondar", () => {
    expect(microsParaReais(1_000_000)).toBe(1);
    expect(microsParaReais(12_345_678)).toBe(12.345678);
    expect(microsParaReais(0)).toBe(0);
  });
});

describe("GAQL", () => {
  it.each([montarGaqlDeCampanhas, montarGaqlDePalavrasChave, montarGaqlDeAnuncios])(
    "%o filtra pelo período e é só leitura",
    (montar) => {
      const gaql = montar(intervalo);
      expect(gaql).toContain("segments.date BETWEEN '2026-09-15' AND '2026-10-14'");
      expect(gaql).toMatch(/^SELECT/);
      expect(gaql).toContain("!= 'REMOVED'");
      expect(gaql).toContain("metrics.cost_micros");
    },
  );
});

describe("mapearLinhasDeCampanha", () => {
  it("lê enums numéricos (formato da biblioteca) e converte micros", () => {
    const [campanha] = mapearLinhasDeCampanha([
      {
        campaign: { id: 123, name: "Pesquisa - Sofás", status: 2 },
        metrics: { impressions: 1000, clicks: 40, cost_micros: 85_500_000, conversions: 3 },
      },
    ]);
    expect(campanha).toEqual({
      campanhaId: "123",
      nome: "Pesquisa - Sofás",
      status: "Ativa",
      impressoes: 1000,
      cliques: 40,
      custo: 85.5,
      conversoes: 3,
    });
  });

  it("aceita enums em texto e métricas como texto", () => {
    const [campanha] = mapearLinhasDeCampanha([
      { campaign: { id: "9", name: "X", status: "PAUSED" }, metrics: { impressions: "10", cost_micros: "2000000" } },
    ]);
    expect(campanha).toMatchObject({ status: "Pausada", impressoes: 10, cliques: 0, custo: 2 });
  });

  it("linha sem métricas vira zeros; linha sem campanha é ignorada", () => {
    const campanhas = mapearLinhasDeCampanha([{ campaign: { id: 1, name: "Nova" } }, { metrics: {} }, null]);
    expect(campanhas).toEqual([
      { campanhaId: "1", nome: "Nova", status: "Outro", impressoes: 0, cliques: 0, custo: 0, conversoes: 0 },
    ]);
  });
});

describe("mapearLinhasDePalavraChave", () => {
  it("lê texto, tipo de correspondência e o grupo", () => {
    const [p] = mapearLinhasDePalavraChave([
      {
        ad_group_criterion: { criterion_id: 55, keyword: { text: "sofá barato", match_type: 4 } },
        ad_group: { id: 7, name: "Sofás" },
        campaign: { name: "Pesquisa" },
        metrics: { impressions: 300, clicks: 12, cost_micros: 61_000_000, conversions: 0 },
      },
    ]);
    expect(p).toEqual({
      criterioId: "55",
      texto: "sofá barato",
      correspondencia: "Ampla",
      grupoId: "7",
      grupoNome: "Sofás",
      campanhaNome: "Pesquisa",
      impressoes: 300,
      cliques: 12,
      custo: 61,
      conversoes: 0,
    });
  });
});

describe("mapearLinhasDeAnuncio", () => {
  it("usa o primeiro título com texto como nome do anúncio", () => {
    const [a] = mapearLinhasDeAnuncio([
      {
        ad_group_ad: { ad: { id: 8, responsive_search_ad: { headlines: [{ text: null }, { text: "Sofás sob medida" }] } } },
        ad_group: { id: 7, name: "Sofás" },
        metrics: { impressions: 100, clicks: 2 },
      },
    ]);
    expect(a).toMatchObject({ anuncioId: "8", titulo: "Sofás sob medida", grupoId: "7", campanhaNome: "" });
  });

  it("anúncio que não é RSA recebe nome padrão", () => {
    const [a] = mapearLinhasDeAnuncio([{ ad_group_ad: { ad: { id: 9 } }, ad_group: { id: 7 }, metrics: {} }]);
    expect(a?.titulo).toBe("Anúncio 9");
  });
});
