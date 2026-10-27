import { describe, expect, it } from "vitest";
import { montarRascunho } from "@/api/servicos/montagem-de-campanha";

describe("montarRascunho", () => {
  it("monta um rascunho com grupos, anúncios e orçamento estimado", () => {
    const rascunho = montarRascunho({
      nome: "Pesquisa 2026-10-27",
      orcamentoDiarioCentavos: 30_00,
      palavras: [
        { texto: "sofá moderno", correspondencia: "FRASE" },
        { texto: "sofa sob medida", correspondencia: "FRASE" },
        { texto: "cadeira de jantar", correspondencia: "EXATA" },
        { texto: "móveis planejados", correspondencia: "FRASE" },
        { texto: "estofados sob medida", correspondencia: "EXATA" },
        { texto: "cobertor para sofá", correspondencia: "FRASE" },
      ],
      negativas: ["sofá usado", "estofado barato"],
      urlFinal: "https://lojademo.com.br",
      tema: "Móveis",
    });

    expect(rascunho.nome).toBe("Pesquisa 2026-10-27");
    expect(rascunho.grupos.length).toBeGreaterThanOrEqual(1);
    expect(rascunho.grupos.length).toBeLessThanOrEqual(3);
    expect(rascunho.grupos.every((grupo) => grupo.anuncio.titulos.length >= 10)).toBe(true);
    expect(rascunho.grupos.every((grupo) => grupo.anuncio.descricoes.length >= 4)).toBe(true);
    expect(rascunho.orcamentoMensalEstimadoCentavos).toBe(30_00 * 30.4);
    expect(rascunho.negativas).toEqual(["sofá usado", "estofado barato"]);
    expect(rascunho.urlFinal).toBe("https://lojademo.com.br");
  });

  it("rejeita quando não há palavra para montar campanha", () => {
    expect(() => montarRascunho({
      nome: "Sem palavras",
      orcamentoDiarioCentavos: 20_00,
      palavras: [],
      tema: "Móveis",
    })).toThrow(/Selecione pelo menos uma palavra/);
  });

  it("remove duplicados e textos fora do limite", () => {
    const rascunho = montarRascunho({
      nome: "Teste de limite",
      orcamentoDiarioCentavos: 15_00,
      palavras: [
        { texto: "sofa", correspondencia: "EXATA" },
        { texto: "sofa", correspondencia: "EXATA" },
        { texto: "móveis planejados", correspondencia: "FRASE" },
        { texto: "móveis planejados", correspondencia: "FRASE" },
      ],
      tema: "Móveis",
    });

    expect(rascunho.palavras.map((p) => p.texto)).toEqual(expect.arrayContaining(["sofa", "móveis planejados"]));
    expect(rascunho.grupos.every((grupo) => grupo.anuncio.titulos.every((titulo) => titulo.length <= 30))).toBe(true);
    expect(rascunho.grupos.every((grupo) => grupo.anuncio.descricoes.every((descricao) => descricao.length <= 90))).toBe(true);
  });
});
