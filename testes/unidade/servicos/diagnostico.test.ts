import { describe, expect, it } from "vitest";
import type { AnuncioRsa } from "@/api/integracoes/google-ads/anuncios";
import {
  calcularNotaDoAnuncio,
  classificarNota,
  contarCaracteresVisiveis,
  normalizarTexto,
  PESOS,
  type RegraDoDiagnostico,
} from "@/api/servicos/diagnostico";

/** Anúncio que passa em todas as regras (nota 100). Cada teste estraga só uma coisa. */
function anuncioPerfeito(parcial: Partial<AnuncioRsa> = {}): AnuncioRsa {
  return {
    anuncioId: "1",
    grupoId: "10",
    grupoNome: "Sofás",
    campanhaNome: "Pesquisa",
    status: "Ativo",
    titulos: [
      "Sofá Retrátil Sob Medida",
      "Entrega em Até 15 Dias",
      "Parcele em 10x Sem Juros",
      "Tecidos Impermeáveis",
      "Fábrica Própria em SP",
      "Garantia de 5 Anos",
      "Peça Seu Orçamento Hoje",
      "Mais de 2 Mil Clientes",
      "Projeto 3D Grátis",
      "Showroom na Zona Sul",
    ],
    descricoes: [
      "Sofás retráteis feitos sob medida para a sua sala. Escolha tecido, cor e tamanho.",
      "Fábrica própria: preço justo e entrega rápida. Peça seu orçamento pelo WhatsApp.",
      "Tecidos impermeáveis e antimanchas, ideais para quem tem pets e crianças.",
      "Garantia de 5 anos na estrutura. Visite nosso showroom na Zona Sul de SP.",
    ],
    urlFinal: "https://exemplo.com.br/sofas",
    forca: "EXCELENTE",
    ...parcial,
  };
}

const palavras = ["sofá retrátil", "sofa sob medida"];

function itemDa(regra: RegraDoDiagnostico, anuncio: AnuncioRsa, palavrasDoGrupo = palavras) {
  const item = calcularNotaDoAnuncio(anuncio, palavrasDoGrupo).itens.find((i) => i.regra === regra);
  if (!item) throw new Error(`regra ${regra} não avaliada`);
  return item;
}

describe("utilitários de texto", () => {
  it("normalizarTexto ignora maiúsculas, acentos e pontuação", () => {
    expect(normalizarTexto("  Sofá-Retrátil, SOB medida!! ")).toBe("sofa retratil sob medida");
  });

  it("contarCaracteresVisiveis conta inserção de palavra-chave pelo texto padrão", () => {
    expect(contarCaracteresVisiveis("{KeyWord:Sofás} em SP")).toBe("Sofás em SP".length);
    expect(contarCaracteresVisiveis("Ação")).toBe(4);
    expect(contarCaracteresVisiveis("Sofá 🛋️")).toBe([..."Sofá 🛋️"].length);
  });
});

describe("calcularNotaDoAnuncio", () => {
  it("anúncio sem problemas tira 100 e todos os itens ficam ok", () => {
    const d = calcularNotaDoAnuncio(anuncioPerfeito(), palavras);
    expect(d.nota).toBe(100);
    expect(d.classificacao).toBe("Boa");
    expect(d.itens).toHaveLength(6);
    expect(d.itens.every((i) => i.situacao === "ok")).toBe(true);
  });

  it("os pesos somam 100 (pior caso possível = 0)", () => {
    const pior =
      PESOS.poucosTitulos + PESOS.poucasDescricoes + PESOS.limiteDeCaracteres + PESOS.palavraChaveNoTitulo +
      PESOS.chamadaParaAcao + PESOS.titulosDuplicados + PESOS.forcaRuim;
    expect(pior).toBe(100);
    const d = calcularNotaDoAnuncio(
      anuncioPerfeito({ titulos: ["Título muito longo que passa do limite", "abc", "ABC"], descricoes: ["Texto"], forca: "RUIM" }),
      palavras,
    );
    expect(d.nota).toBe(0);
    expect(d.classificacao).toBe("Ruim");
  });

  it("erros vêm antes de avisos, que vêm antes de ok", () => {
    const d = calcularNotaDoAnuncio(anuncioPerfeito({ forca: "MEDIA", titulos: ["Título bem comprido que passa do limite"] }), palavras);
    const situacoes = d.itens.map((i) => i.situacao);
    expect(situacoes.indexOf("erro")).toBeLessThan(situacoes.indexOf("aviso"));
    expect(situacoes.lastIndexOf("aviso")).toBeLessThan(situacoes.indexOf("ok"));
  });
});

describe("regra 1 — quantidade de títulos e descrições", () => {
  it("menos de 10 títulos perde os pontos de títulos", () => {
    const item = itemDa("quantidade", anuncioPerfeito({ titulos: anuncioPerfeito().titulos.slice(0, 9) }));
    expect(item).toMatchObject({ situacao: "aviso", pontosPerdidos: PESOS.poucosTitulos });
    expect(item.comoCorrigir).toContain("1 título");
  });

  it("menos de 4 descrições perde os pontos de descrições", () => {
    const item = itemDa("quantidade", anuncioPerfeito({ descricoes: anuncioPerfeito().descricoes.slice(0, 2) }));
    expect(item).toMatchObject({ situacao: "aviso", pontosPerdidos: PESOS.poucasDescricoes });
  });

  it("os dois juntos somam", () => {
    const item = itemDa("quantidade", anuncioPerfeito({ titulos: ["Sofá Retrátil"], descricoes: ["Peça já"] }));
    expect(item.pontosPerdidos).toBe(PESOS.poucosTitulos + PESOS.poucasDescricoes);
  });
});

describe("regra 2 — limite de caracteres", () => {
  it("título com 31 caracteres é erro e mostra o tamanho", () => {
    const titulo = "A".repeat(31);
    const item = itemDa("limiteDeCaracteres", anuncioPerfeito({ titulos: [...anuncioPerfeito().titulos, titulo] }));
    expect(item).toMatchObject({ situacao: "erro", pontosPerdidos: PESOS.limiteDeCaracteres });
    expect(item.problema).toContain("31/30");
  });

  it("título com exatamente 30 e descrição com exatamente 90 passam", () => {
    const item = itemDa(
      "limiteDeCaracteres",
      anuncioPerfeito({
        titulos: [...anuncioPerfeito().titulos, "B".repeat(30)],
        descricoes: [...anuncioPerfeito().descricoes, "C".repeat(90)],
      }),
    );
    expect(item.situacao).toBe("ok");
  });

  it("descrição com 91 é erro", () => {
    const item = itemDa("limiteDeCaracteres", anuncioPerfeito({ descricoes: [...anuncioPerfeito().descricoes, "D".repeat(91)] }));
    expect(item.problema).toContain("91/90");
  });
});

describe("regra 3 — palavra-chave no título", () => {
  it("nenhuma palavra do grupo nos títulos é erro e sugere quais usar", () => {
    const item = itemDa("palavraChaveNoTitulo", anuncioPerfeito(), ["poltrona reclinável"]);
    expect(item).toMatchObject({ situacao: "erro", pontosPerdidos: PESOS.palavraChaveNoTitulo });
    expect(item.comoCorrigir).toContain("poltrona reclinável");
  });

  it("encontra ignorando acentos e maiúsculas", () => {
    expect(itemDa("palavraChaveNoTitulo", anuncioPerfeito(), ["SOFA RETRATIL"]).situacao).toBe("ok");
  });

  it("não aceita pedaço de palavra (sofá ≠ sofás)", () => {
    const anuncio = anuncioPerfeito({ titulos: ["Sofás Lindos", ...anuncioPerfeito().titulos.slice(1)] });
    expect(itemDa("palavraChaveNoTitulo", anuncio, ["sofá"]).situacao).toBe("erro");
  });

  it("grupo sem palavras-chave: não se aplica (não perde pontos)", () => {
    expect(itemDa("palavraChaveNoTitulo", anuncioPerfeito(), [])).toMatchObject({ situacao: "ok", pontosPerdidos: 0 });
  });
});

describe("regra 4 — chamada para ação", () => {
  const semAcao = anuncioPerfeito({
    titulos: anuncioPerfeito().titulos.filter((t) => !t.startsWith("Peça")),
    descricoes: [
      "Sofás retráteis feitos sob medida para a sua sala.",
      "Fábrica própria com preço justo.",
      "Tecidos impermeáveis e antimanchas.",
      "Garantia de 5 anos na estrutura.",
    ],
  });

  it("sem verbo de ação é aviso", () => {
    expect(itemDa("chamadaParaAcao", semAcao)).toMatchObject({ situacao: "aviso", pontosPerdidos: PESOS.chamadaParaAcao });
  });

  it("verbo de ação em uma descrição já basta (com ou sem acento)", () => {
    const comAcao = { ...semAcao, descricoes: [...semAcao.descricoes.slice(0, 3), "Faca seu pedido online agora."] };
    expect(itemDa("chamadaParaAcao", comAcao).situacao).toBe("ok");
  });

  it("palavra que só contém o verbo não conta (ex.: 'comprador')", () => {
    const comprador = { ...semAcao, descricoes: [...semAcao.descricoes.slice(0, 3), "Feito para o comprador exigente."] };
    expect(itemDa("chamadaParaAcao", comprador).situacao).toBe("aviso");
  });
});

describe("regra 5 — títulos duplicados", () => {
  it("mesmo texto com maiúsculas/acentos diferentes conta como duplicado", () => {
    const anuncio = anuncioPerfeito({ titulos: [...anuncioPerfeito().titulos, "sofa retratil sob medida!"] });
    const item = itemDa("titulosDuplicados", anuncio);
    expect(item).toMatchObject({ situacao: "aviso", pontosPerdidos: PESOS.titulosDuplicados });
    expect(item.problema).toContain('"Sofá Retrátil Sob Medida"');
  });

  it("perde os pontos uma vez só, mesmo com vários duplicados", () => {
    const anuncio = anuncioPerfeito({ titulos: [...anuncioPerfeito().titulos, "garantia de 5 anos", "PROJETO 3D GRÁTIS"] });
    expect(itemDa("titulosDuplicados", anuncio).pontosPerdidos).toBe(PESOS.titulosDuplicados);
  });
});

describe("regra 6 — força do anúncio no Google", () => {
  it("Ruim é erro e perde o peso cheio", () => {
    expect(itemDa("forcaDoAnuncio", anuncioPerfeito({ forca: "RUIM" }))).toMatchObject({ situacao: "erro", pontosPerdidos: PESOS.forcaRuim });
  });

  it("Média é aviso e perde metade", () => {
    expect(itemDa("forcaDoAnuncio", anuncioPerfeito({ forca: "MEDIA" }))).toMatchObject({ situacao: "aviso", pontosPerdidos: PESOS.forcaMedia });
  });

  it.each(["BOA", "EXCELENTE", "PENDENTE", "SEM_DADOS"] as const)("%s não perde pontos", (forca) => {
    expect(itemDa("forcaDoAnuncio", anuncioPerfeito({ forca })).pontosPerdidos).toBe(0);
  });
});

describe("classificarNota", () => {
  it("limites: 80 Boa, 79 Média, 50 Média, 49 Ruim", () => {
    expect(classificarNota(80)).toBe("Boa");
    expect(classificarNota(79)).toBe("Média");
    expect(classificarNota(50)).toBe("Média");
    expect(classificarNota(49)).toBe("Ruim");
  });
});
