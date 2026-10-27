import { describe, expect, it } from "vitest";
import { mapearLinhasDeTermo, montarGaqlDeTermos } from "@/api/integracoes/google-ads/termos";
import { escaparCelulaCsv, montarCsv, montarCsvDeNegativas, montarCsvDePalavrasNovas, montarCsvDeRecomendadas } from "@/api/servicos/csv";
import {
  MAXIMO_DE_SUGESTOES,
  somarGastoDeTermosSemConversao,
  sugerirNegativasPorRegra,
  sugerirPalavrasNovasPorRegra,
} from "@/api/servicos/termos";
import { termo } from "../../apoio/fabricas-termos";

describe("termos de pesquisa (integração)", () => {
  it("GAQL usa search_term_view com o período", () => {
    const gaql = montarGaqlDeTermos({ inicio: "2026-09-15", fim: "2026-10-14" });
    expect(gaql).toContain("FROM search_term_view");
    expect(gaql).toContain("BETWEEN '2026-09-15' AND '2026-10-14'");
  });

  it.each([
    [2, "ADICIONADO"],
    [3, "EXCLUIDO"],
    [4, "ADICIONADO_E_EXCLUIDO"],
    [5, "NENHUMA"],
    ["EXCLUDED", "EXCLUIDO"],
    [undefined, "NENHUMA"],
  ])("status %s → %s", (status, esperado) => {
    const [t] = mapearLinhasDeTermo([
      { search_term_view: { search_term: "x", status }, ad_group: { id: 1 }, metrics: { cost_micros: 2_500_000, clicks: 3 } },
    ]);
    expect(t).toMatchObject({ situacao: esperado, custo: 2.5, cliques: 3, grupoId: "1" });
  });

  it("ignora linha sem termo", () => {
    expect(mapearLinhasDeTermo([{ search_term_view: { search_term: "" }, ad_group: { id: 1 } }, null])).toEqual([]);
  });
});

describe("sugerirNegativasPorRegra (F5.2)", () => {
  it("só termos que gastaram, não converteram e ainda não foram tratados; do mais caro ao mais barato", () => {
    const negativas = sugerirNegativasPorRegra([
      termo({ termo: "barato", custo: 5 }),
      termo({ termo: "caro", custo: 50 }),
      termo({ termo: "converteu", custo: 80, conversoes: 1 }),
      termo({ termo: "sem custo", custo: 0 }),
      termo({ termo: "já é palavra", custo: 90, situacao: "ADICIONADO" }),
      termo({ termo: "já excluído", custo: 90, situacao: "EXCLUIDO" }),
    ]);
    expect(negativas.map((n) => n.termo)).toEqual(["caro", "barato"]);
    expect(negativas[0]).toMatchObject({ correspondencia: "Exata", origem: "regra", motivo: expect.stringContaining("nenhuma conversão") });
  });

  it(`limita a ${MAXIMO_DE_SUGESTOES}`, () => {
    const muitos = Array.from({ length: 150 }, (_, i) => termo({ termo: `t${i}`, custo: i + 1 }));
    expect(sugerirNegativasPorRegra(muitos)).toHaveLength(MAXIMO_DE_SUGESTOES);
  });
});

describe("sugerirPalavrasNovasPorRegra (F5.3)", () => {
  it("termos que converteram e não são palavra do grupo; 2+ conversões = Exata, 1 = Frase", () => {
    const novas = sugerirPalavrasNovasPorRegra(
      [
        termo({ termo: "sofá cama casal", conversoes: 3 }),
        termo({ termo: "sofá 3 lugares", conversoes: 1 }),
        termo({ termo: "Sofá Retrátil", conversoes: 5 }), // já é palavra do grupo (ignora acento/maiúscula)
        termo({ termo: "sofá de canto", conversoes: 2, grupoId: "99" }), // mesma palavra existe só em OUTRO grupo
        termo({ termo: "sem conversão", conversoes: 0 }),
        termo({ termo: "já adicionado", conversoes: 4, situacao: "ADICIONADO" }),
      ],
      { "10": ["sofa retratil", "sofá de canto"] },
    );
    expect(novas.map((n) => [n.texto, n.correspondencia])).toEqual([
      ["sofá cama casal", "Exata"],
      ["sofá de canto", "Exata"],
      ["sofá 3 lugares", "Frase"],
    ]);
  });

  it("soma o gasto de termos sem conversão", () => {
    expect(somarGastoDeTermosSemConversao([termo({ custo: 10 }), termo({ custo: 2.5 }), termo({ custo: 99, conversoes: 1 })])).toBeCloseTo(12.5);
  });
});

describe("CSV (F5.4)", () => {
  it("escapa vírgula, aspas e quebra de linha", () => {
    expect(escaparCelulaCsv("simples")).toBe("simples");
    expect(escaparCelulaCsv("a,b")).toBe('"a,b"');
    expect(escaparCelulaCsv('diz "oi"')).toBe('"diz ""oi"""');
    expect(escaparCelulaCsv("linha\nnova")).toBe('"linha\nnova"');
    expect(escaparCelulaCsv(12.5)).toBe("12.5");
  });

  it.each(["=HYPERLINK(\"http://mal\")", "+1+1", "-2+3", "@SOMA(A1)", "\tx"])(
    "neutraliza fórmula vinda de termo de pesquisa: %s",
    (perigoso) => {
      expect(escaparCelulaCsv(perigoso).replace(/^"/, "")).toMatch(/^'/);
    },
  );

  it("começa com BOM e usa \\r\\n", () => {
    const csv = montarCsv(["A", "B"], [["1", "2"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿A,B\r\n1,2");
  });

  it("negativas e palavras novas no formato do Google Ads Editor", () => {
    const [negativa] = sugerirNegativasPorRegra([termo({ termo: "sofá grátis", campanhaNome: "Pesquisa, SP" })]);
    expect(montarCsvDeNegativas(negativa ? [negativa] : [])).toBe(
      '﻿Campaign,Ad group,Keyword,Criterion Type\r\n"Pesquisa, SP",Sofás,sofá grátis,Negative exact',
    );
    const [nova] = sugerirPalavrasNovasPorRegra([termo({ termo: "sofá cama", conversoes: 1 })], {});
    expect(montarCsvDePalavrasNovas(nova ? [nova] : [])).toContain("Pesquisa,Sofás,sofá cama,Phrase");
  });
});

describe("montarCsvDeRecomendadas (pesquisa de mercado)", () => {
  const base = { motivo: "m", volumeMensal: null, concorrencia: "BAIXA" as const, lanceBaixo: null, lanceAlto: null };

  it("usa o formato do Editor com Campaign e Ad group vazios", () => {
    const csv = montarCsvDeRecomendadas(
      [
        { ...base, texto: "sofá retrátil", correspondencia: "Exata" },
        { ...base, texto: "sofá cama", correspondencia: "Frase" },
      ],
      [{ termo: "grátis", motivo: "x" }],
    );
    expect(csv).toBe(
      ["﻿Campaign,Ad group,Keyword,Criterion Type", ",,sofá retrátil,Exact", ",,sofá cama,Phrase", ",,grátis,Negative exact"].join(String.fromCharCode(13, 10)),
    );
  });

  it.each(["=cmd", "+1", "-2", "@x"])("protege %s no começo contra fórmula", (texto) => {
    const csv = montarCsvDeRecomendadas([{ ...base, texto, correspondencia: "Exata" }], [{ termo: texto, motivo: "" }]);
    expect(csv).toContain(`,,'${texto},Exact`);
    expect(csv).toContain(`,,'${texto},Negative exact`);
  });
});
