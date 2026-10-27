import { describe, expect, it } from "vitest";
import { buscarIdeiasDePalavras, mapearIdeiasDePalavras, type PedidoDeIdeias } from "@/api/integracoes/google-ads/planejador";
import { criarApiGoogleAdsFalsa } from "../../apoio/google-falso";

describe("mapearIdeiasDePalavras", () => {
  it("converte métricas, enum numérico e micros", () => {
    const r = mapearIdeiasDePalavras({
      results: [
        {
          text: "sofá retrátil",
          keyword_idea_metrics: {
            avg_monthly_searches: 12100,
            competition: 4,
            low_top_of_page_bid_micros: 1_230_000,
            high_top_of_page_bid_micros: 4_560_000,
          },
        },
      ],
    });
    expect(r).toEqual([{ texto: "sofá retrátil", volumeMensal: 12100, concorrencia: "ALTA", lanceBaixo: 1.23, lanceAlto: 4.56 }]);
  });

  it("aceita enum em texto (LOW/MEDIUM/HIGH → BAIXA/MEDIA/ALTA)", () => {
    const r = mapearIdeiasDePalavras({
      results: ["LOW", "MEDIUM", "HIGH", "UNSPECIFIED"].map((competition, i) => ({
        text: `ideia ${i}`,
        keyword_idea_metrics: { avg_monthly_searches: 10, competition },
      })),
    });
    expect(r.map((i) => i.concorrencia)).toEqual(["BAIXA", "MEDIA", "ALTA", "SEM_DADOS"]);
  });

  it("sem keyword_idea_metrics → volume e lances null, SEM_DADOS", () => {
    expect(mapearIdeiasDePalavras({ results: [{ text: "sofá cama" }] })).toEqual([
      { texto: "sofá cama", volumeMensal: null, concorrencia: "SEM_DADOS", lanceBaixo: null, lanceAlto: null },
    ]);
  });

  it("descarta linhas sem text e repete só a 1ª ocorrência de cada texto normalizado", () => {
    const r = mapearIdeiasDePalavras({
      results: [
        { text: "Sofá Retrátil", keyword_idea_metrics: { avg_monthly_searches: 100 } },
        { keyword_idea_metrics: { avg_monthly_searches: 5 } },
        { text: "", keyword_idea_metrics: { avg_monthly_searches: 5 } },
        { text: "sofa retratil", keyword_idea_metrics: { avg_monthly_searches: 999 } },
        { text: "poltrona" },
      ],
    });
    expect(r.map((i) => [i.texto, i.volumeMensal])).toEqual([
      ["Sofá Retrátil", 100],
      ["poltrona", null],
    ]);
  });

  it("resposta vazia ou {} → []", () => {
    expect(mapearIdeiasDePalavras({})).toEqual([]);
    expect(mapearIdeiasDePalavras({ results: [] })).toEqual([]);
    expect(mapearIdeiasDePalavras(null)).toEqual([]);
  });
});

it("buscarIdeiasDePalavras repassa o pedido para a api e mapeia", async () => {
  const { api, pedidosDeIdeias } = criarApiGoogleAdsFalsa({}, { ideias: { results: [{ text: "sofá 3 lugares", keyword_idea_metrics: { avg_monthly_searches: 50, competition: "LOW" } }] } });
  const credenciais = { customerId: "111", loginCustomerId: null, refreshToken: "rt" };
  const pedido: PedidoDeIdeias = { palavrasSemente: ["sofá"], idsGeo: ["1001773"], idioma: "1014" };
  const r = await buscarIdeiasDePalavras(api, credenciais, pedido);
  expect(pedidosDeIdeias).toEqual([{ credenciais, pedido }]);
  expect(r).toEqual([{ texto: "sofá 3 lugares", volumeMensal: 50, concorrencia: "BAIXA", lanceBaixo: null, lanceAlto: null }]);
});
