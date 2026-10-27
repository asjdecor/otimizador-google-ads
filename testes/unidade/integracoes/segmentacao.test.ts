import { describe, expect, it } from "vitest";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "@/api/integracoes/google-ads/api-google-ads";
import {
  buscarDominioPrincipal,
  buscarSegmentacao,
  extrairDominioPrincipal,
  GAQL_SEGMENTACAO,
  GAQL_URLS_FINAIS,
  mapearSegmentacao,
  montarGaqlNomesGeo,
  normalizarDominio,
} from "@/api/integracoes/google-ads/segmentacao";
import { responderConsultaDeDemonstracao } from "@/api/integracoes/demonstracao/dados";

const credenciais = {} as CredenciaisDeConsulta;

function apiFalsa(respostas: (gaql: string) => unknown[]) {
  const consultas: string[] = [];
  const api = {
    consultar: async (_c: unknown, gaql: string) => {
      consultas.push(gaql);
      return respostas(gaql);
    },
  } as unknown as ApiGoogleAds;
  return { api, consultas };
}

const local = (id: string, negativo = false) => ({
  campaign_criterion: { type: 7, negative: negativo, location: { geo_target_constant: `geoTargetConstants/${id}` } },
});
const idioma = (id: string) => ({
  campaign_criterion: { type: "LANGUAGE", negative: false, language: { language_constant: `languageConstants/${id}` } },
});

describe("montarGaqlNomesGeo", () => {
  it("monta a consulta com os ids", () => {
    const gaql = montarGaqlNomesGeo(["1001773", "1001774"]);
    expect(gaql).toContain("FROM geo_target_constant");
    expect(gaql).toContain("IN ('geoTargetConstants/1001773', 'geoTargetConstants/1001774')");
  });

  it("recusa id que não seja só dígitos", () => {
    expect(() => montarGaqlNomesGeo(["1001773", "1; DROP"])).toThrow(/inválido/);
  });
});

describe("mapearSegmentacao", () => {
  it("extrai ids de região sem repetição e ignora as negativas", () => {
    const r = mapearSegmentacao([local("1001773"), local("1001773"), local("2076", true), idioma("1014")]);
    expect(r.idsGeo).toEqual(["1001773"]);
    expect(r.idiomas).toEqual(["1014"]);
  });

  it("sem idioma usa português (1014)", () => {
    expect(mapearSegmentacao([local("1001773")]).idiomas).toEqual(["1014"]);
  });

  it("sem linhas, não há região", () => {
    expect(mapearSegmentacao([])).toEqual({ idsGeo: [], nomesGeo: [], idiomas: ["1014"] });
  });
});

describe("buscarSegmentacao", () => {
  it("sem região não faz a segunda consulta", async () => {
    const { api, consultas } = apiFalsa(() => []);
    const r = await buscarSegmentacao(api, credenciais);
    expect(consultas).toEqual([GAQL_SEGMENTACAO]);
    expect(r.nomesGeo).toEqual([]);
  });

  it("com região busca os nomes legíveis", async () => {
    const { api, consultas } = apiFalsa((g) =>
      g === GAQL_SEGMENTACAO ? [local("1001773")] : [{ geo_target_constant: { canonical_name: "São Paulo,São Paulo,Brazil" } }],
    );
    const r = await buscarSegmentacao(api, credenciais);
    expect(consultas).toHaveLength(2);
    expect(r.nomesGeo).toEqual(["São Paulo,São Paulo,Brazil"]);
  });
});

describe("domínio principal", () => {
  const anuncio = (...urls: string[]) => ({ ad_group_ad: { ad: { final_urls: urls } } });

  it("escolhe o domínio mais frequente", () => {
    const d = extrairDominioPrincipal([
      anuncio("https://www.loja.com.br/a"),
      anuncio("https://outra.com/x"),
      anuncio("https://LOJA.com.br/b"),
    ]);
    expect(d).toBe("loja.com.br");
  });

  it("sem URLs devolve null", () => {
    expect(extrairDominioPrincipal([])).toBeNull();
    expect(extrairDominioPrincipal([anuncio()])).toBeNull();
  });

  it("buscarDominioPrincipal usa a consulta de URLs finais", async () => {
    const { api, consultas } = apiFalsa(() => [anuncio("https://www.loja.com.br/")]);
    expect(await buscarDominioPrincipal(api, credenciais)).toBe("loja.com.br");
    expect(consultas).toEqual([GAQL_URLS_FINAIS]);
  });
});

describe("normalizarDominio", () => {
  it("normaliza entradas válidas", () => {
    expect(normalizarDominio("Loja.COM.br")).toBe("loja.com.br");
    expect(normalizarDominio("https://www.loja.com.br/a?b")).toBe("loja.com.br");
  });

  it("recusa o que não é domínio", () => {
    expect(normalizarDominio("loja")).toBeNull();
    expect(normalizarDominio("")).toBeNull();
    expect(normalizarDominio("javascript:alert(1)")).toBeNull();
  });
});

describe("dados de demonstração", () => {
  it("devolvem segmentação e domínio de São Paulo", async () => {
    const { api } = apiFalsa(responderConsultaDeDemonstracao);
    const seg = await buscarSegmentacao(api, credenciais);
    expect(seg.idsGeo).toEqual(["1001773"]);
    expect(seg.nomesGeo[0]).toContain("São Paulo");
    expect(seg.idiomas).toEqual(["1014"]);
    expect(await buscarDominioPrincipal(api, credenciais)).toBe("sofas-demo.example");
  });
});
