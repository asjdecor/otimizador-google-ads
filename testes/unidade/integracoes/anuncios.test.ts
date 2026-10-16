import { describe, expect, it } from "vitest";
import {
  GAQL_ANUNCIOS_RSA,
  GAQL_PALAVRAS_DOS_GRUPOS,
  mapearLinhasDeAnuncioRsa,
  mapearPalavrasPorGrupo,
} from "@/api/integracoes/google-ads/anuncios";

describe("GAQL de anúncios e palavras", () => {
  it("só busca RSA e palavras positivas, sem removidos", () => {
    expect(GAQL_ANUNCIOS_RSA).toContain("ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'");
    expect(GAQL_ANUNCIOS_RSA).toContain("ad_group_ad.ad_strength");
    expect(GAQL_PALAVRAS_DOS_GRUPOS).toContain("ad_group_criterion.negative = FALSE");
    expect(GAQL_PALAVRAS_DOS_GRUPOS).toContain("ad_group_criterion.status != 'REMOVED'");
  });
});

describe("mapearLinhasDeAnuncioRsa", () => {
  it("lê títulos, descrições, URL, força e status (enums numéricos)", () => {
    const [a] = mapearLinhasDeAnuncioRsa([
      {
        ad_group_ad: {
          ad: {
            id: 77,
            responsive_search_ad: {
              headlines: [{ text: "Sofás" }, { text: "" }, { text: null }, { text: "Entrega Rápida" }],
              descriptions: [{ text: "Peça já." }],
            },
            final_urls: ["https://loja.com/sofas", "https://loja.com/outra"],
          },
          ad_strength: 5,
          status: 2,
        },
        ad_group: { id: 10, name: "Sofás" },
        campaign: { name: "Pesquisa" },
      },
    ]);
    expect(a).toEqual({
      anuncioId: "77",
      grupoId: "10",
      grupoNome: "Sofás",
      campanhaNome: "Pesquisa",
      status: "Ativo",
      titulos: ["Sofás", "Entrega Rápida"],
      descricoes: ["Peça já."],
      urlFinal: "https://loja.com/sofas",
      forca: "MEDIA",
    });
  });

  it.each([
    [4, "RUIM"],
    [6, "BOA"],
    [7, "EXCELENTE"],
    [2, "PENDENTE"],
    ["POOR", "RUIM"],
    [1, "SEM_DADOS"],
    [undefined, "SEM_DADOS"],
  ])("força %s → %s", (codigo, esperado) => {
    const [a] = mapearLinhasDeAnuncioRsa([{ ad_group_ad: { ad: { id: 1 }, ad_strength: codigo }, ad_group: { id: 2 } }]);
    expect(a?.forca).toBe(esperado);
  });

  it("anúncio sem dados de RSA vira listas vazias; linha quebrada é ignorada", () => {
    const anuncios = mapearLinhasDeAnuncioRsa([{ ad_group_ad: { ad: { id: 1 }, status: 3 }, ad_group: { id: 2 } }, { foo: 1 }]);
    expect(anuncios).toEqual([
      expect.objectContaining({ titulos: [], descricoes: [], urlFinal: null, status: "Pausado" }),
    ]);
  });
});

describe("mapearPalavrasPorGrupo", () => {
  it("agrupa por grupo e remove repetidas", () => {
    expect(
      mapearPalavrasPorGrupo([
        { ad_group: { id: 1 }, ad_group_criterion: { keyword: { text: "sofá" } } },
        { ad_group: { id: 1 }, ad_group_criterion: { keyword: { text: "sofá" } } },
        { ad_group: { id: 1 }, ad_group_criterion: { keyword: { text: "poltrona" } } },
        { ad_group: { id: 2 }, ad_group_criterion: { keyword: { text: "mesa" } } },
        { ad_group: { id: 3 } },
      ]),
    ).toEqual({ "1": ["sofá", "poltrona"], "2": ["mesa"] });
  });
});
