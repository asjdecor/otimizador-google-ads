import { describe, expect, it } from "vitest";
import {
  calcularMetricasDerivadas,
  encontrarAnunciosComCtrBaixo,
  encontrarPalavrasChaveQueDesperdicam,
  somarGastoSemConversao,
  somarMetricas,
} from "@/api/servicos/desperdicio";
import { anuncio, palavra } from "../../apoio/fabricas";

describe("calcularMetricasDerivadas", () => {
  it("calcula CTR, CPC e custo por conversão", () => {
    expect(calcularMetricasDerivadas({ impressoes: 1000, cliques: 50, custo: 100, conversoes: 4 })).toEqual({
      ctr: 0.05,
      cpcMedio: 2,
      custoPorConversao: 25,
    });
  });

  it("devolve null em vez de dividir por zero", () => {
    expect(calcularMetricasDerivadas({ impressoes: 0, cliques: 0, custo: 0, conversoes: 0 })).toEqual({
      ctr: null,
      cpcMedio: null,
      custoPorConversao: null,
    });
  });

  it("somarMetricas soma tudo (e lista vazia dá zero)", () => {
    expect(somarMetricas([])).toEqual({ impressoes: 0, cliques: 0, custo: 0, conversoes: 0 });
    expect(
      somarMetricas([
        { impressoes: 10, cliques: 1, custo: 2.5, conversoes: 0.5 },
        { impressoes: 20, cliques: 3, custo: 1.5, conversoes: 1 },
      ]),
    ).toEqual({ impressoes: 30, cliques: 4, custo: 4, conversoes: 1.5 });
  });
});

describe("encontrarPalavrasChaveQueDesperdicam (F2.2)", () => {
  it("pega só custo ACIMA do limite e zero conversões", () => {
    const resultado = encontrarPalavrasChaveQueDesperdicam(
      [
        palavra({ criterioId: "igual", custo: 50 }),
        palavra({ criterioId: "acima", custo: 50.01 }),
        palavra({ criterioId: "converteu", custo: 500, conversoes: 1 }),
        palavra({ criterioId: "fracao", custo: 500, conversoes: 0.2 }),
        palavra({ criterioId: "barata", custo: 10 }),
      ],
      50,
    );
    expect(resultado.map((p) => p.criterioId)).toEqual(["acima"]);
  });

  it("ordena da mais cara para a mais barata", () => {
    const resultado = encontrarPalavrasChaveQueDesperdicam(
      [palavra({ criterioId: "b", custo: 80 }), palavra({ criterioId: "a", custo: 300 }), palavra({ criterioId: "c", custo: 60 })],
      50,
    );
    expect(resultado.map((p) => p.criterioId)).toEqual(["a", "b", "c"]);
  });

  it("limite zero pega qualquer gasto sem conversão", () => {
    expect(encontrarPalavrasChaveQueDesperdicam([palavra({ custo: 0.01 }), palavra({ custo: 0 })], 0)).toHaveLength(1);
  });
});

describe("somarGastoSemConversao (F2.4)", () => {
  it("soma tudo que não converteu, independente do limite", () => {
    expect(
      somarGastoSemConversao([palavra({ custo: 10 }), palavra({ custo: 5.5 }), palavra({ custo: 100, conversoes: 2 })]),
    ).toBeCloseTo(15.5);
  });
});

describe("encontrarAnunciosComCtrBaixo (F2.3)", () => {
  it("marca o anúncio abaixo de 70% da média ponderada do grupo", () => {
    // grupo: 100 cliques / 2000 impr = 5%. Limite = 3,5%. Anúncio ruim: 2% → entra.
    const resultado = encontrarAnunciosComCtrBaixo([
      anuncio({ anuncioId: "bom", impressoes: 1000, cliques: 80 }),
      anuncio({ anuncioId: "ruim", impressoes: 1000, cliques: 20 }),
    ]);
    expect(resultado.map((a) => a.anuncioId)).toEqual(["ruim"]);
    expect(resultado[0]?.ctr).toBeCloseTo(0.02);
    expect(resultado[0]?.ctrMedioDoGrupo).toBeCloseTo(0.05);
  });

  it("exatamente 70% da média NÃO entra (regra é 'menor que')", () => {
    // grupo: 1000 impr cada; cliques 130 e 70 → média 10%; 7% = 70% exato.
    const resultado = encontrarAnunciosComCtrBaixo([
      anuncio({ anuncioId: "a", impressoes: 1000, cliques: 130 }),
      anuncio({ anuncioId: "b", impressoes: 1000, cliques: 70 }),
    ]);
    expect(resultado).toEqual([]);
  });

  it("ignora anúncio com menos de 100 impressões", () => {
    const resultado = encontrarAnunciosComCtrBaixo([
      anuncio({ anuncioId: "bom", impressoes: 1000, cliques: 100 }),
      anuncio({ anuncioId: "poucas", impressoes: 99, cliques: 0 }),
      anuncio({ anuncioId: "cem", impressoes: 100, cliques: 0 }),
    ]);
    expect(resultado.map((a) => a.anuncioId)).toEqual(["cem"]);
  });

  it("compara só dentro do mesmo grupo", () => {
    const resultado = encontrarAnunciosComCtrBaixo([
      anuncio({ anuncioId: "g1-alto", grupoId: "g1", impressoes: 1000, cliques: 200 }),
      anuncio({ anuncioId: "g2-baixo-mas-sozinho", grupoId: "g2", impressoes: 1000, cliques: 5 }),
    ]);
    expect(resultado).toEqual([]);
  });

  it("grupo sem cliques não gera alerta", () => {
    expect(
      encontrarAnunciosComCtrBaixo([anuncio({ impressoes: 500, cliques: 0 }), anuncio({ anuncioId: "b", impressoes: 500, cliques: 0 })]),
    ).toEqual([]);
  });

  it("ordena do pior para o menos pior (relativo à média do grupo)", () => {
    const resultado = encontrarAnunciosComCtrBaixo([
      anuncio({ anuncioId: "lider", grupoId: "g1", impressoes: 1000, cliques: 300 }),
      anuncio({ anuncioId: "meio-ruim", grupoId: "g1", impressoes: 1000, cliques: 100 }),
      anuncio({ anuncioId: "lider2", grupoId: "g2", impressoes: 1000, cliques: 300 }),
      anuncio({ anuncioId: "pessimo", grupoId: "g2", impressoes: 1000, cliques: 10 }),
    ]);
    expect(resultado.map((a) => a.anuncioId)).toEqual(["pessimo", "meio-ruim"]);
  });
});
