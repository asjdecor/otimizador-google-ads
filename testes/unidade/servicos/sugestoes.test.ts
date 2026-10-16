import { describe, expect, it } from "vitest";
import type { AnuncioRsa } from "@/api/integracoes/google-ads/anuncios";
import { contarCaracteresVisiveis, LIMITE_DESCRICAO, LIMITE_TITULO, normalizarTexto } from "@/api/servicos/diagnostico";
import {
  filtrarTextosValidos,
  gerarSugestoesDeTitulos,
  MAXIMO_DE_TENTATIVAS,
  montarMensagemDeSugestoes,
  TAMANHO_MAXIMO_DO_CONTEXTO,
} from "@/api/servicos/sugestoes";
import { criarGeradorFalso } from "../../apoio/claude-falso";

const anuncio: AnuncioRsa = {
  anuncioId: "1",
  grupoId: "10",
  grupoNome: "Sofás retráteis",
  campanhaNome: "Pesquisa - Sofás",
  status: "Ativo",
  titulos: ["Sofá Retrátil Sob Medida", "Fábrica Própria"],
  descricoes: ["Sofás feitos sob medida para a sua sala."],
  urlFinal: "https://loja.com/sofas",
  forca: "MEDIA",
};
const palavras = ["sofá retrátil", "sofá sob medida"];

const titulosBons = (n: number, prefixo = "Título") => Array.from({ length: n }, (_, i) => `${prefixo} novo ${i + 1}`);
const descricoesBoas = (n: number, prefixo = "Descrição") => Array.from({ length: n }, (_, i) => `${prefixo} nova número ${i + 1}.`);

describe("montarMensagemDeSugestoes", () => {
  it("inclui anúncio atual, palavras-chave, URL e contexto marcados como dados", () => {
    const mensagem = montarMensagemDeSugestoes({ anuncio, palavrasDoGrupo: palavras, contextoUsuario: "frete grátis em SP" });
    for (const trecho of ["Sofá Retrátil Sob Medida", "sofá retrátil, sofá sob medida", "https://loja.com/sofas", "frete grátis em SP", "<contexto_do_anunciante>", "15 títulos e 4 descrições"]) {
      expect(mensagem).toContain(trecho);
    }
  });

  it("sem contexto e sem palavras-chave avisa isso explicitamente", () => {
    const mensagem = montarMensagemDeSugestoes({ anuncio, palavrasDoGrupo: [] });
    expect(mensagem).toContain("(nenhum contexto extra)");
    expect(mensagem).toContain("(o grupo não tem palavras-chave cadastradas)");
  });

  it("corta contexto acima do limite", () => {
    const mensagem = montarMensagemDeSugestoes({ anuncio, palavrasDoGrupo: palavras, contextoUsuario: "a".repeat(800) });
    expect(mensagem).toContain("a".repeat(TAMANHO_MAXIMO_DO_CONTEXTO));
    expect(mensagem).not.toContain("a".repeat(TAMANHO_MAXIMO_DO_CONTEXTO + 1));
  });
});

describe("filtrarTextosValidos", () => {
  it("descarta acima do limite, vazios, repetidos e os que o anúncio já tem", () => {
    const usados = new Set([normalizarTexto("Fábrica Própria")]);
    const { validos, longos } = filtrarTextosValidos(
      ["Entrega Rápida", "entrega rapida!", "FABRICA PROPRIA", "   ", "x".repeat(31), "y".repeat(30), "  Espaços   extras  "],
      LIMITE_TITULO,
      usados,
    );
    expect(validos).toEqual(["Entrega Rápida", "y".repeat(30), "Espaços extras"]);
    expect(longos).toEqual(["x".repeat(31)]);
  });
});

describe("gerarSugestoesDeTitulos", () => {
  it("resposta boa na primeira tentativa: 1 chamada, tudo aproveitado, custo estimado", async () => {
    const { gerador, mensagens } = criarGeradorFalso([{ titulos: titulosBons(15), descricoes: descricoesBoas(4) }]);
    const resultado = await gerarSugestoesDeTitulos(gerador, { anuncio, palavrasDoGrupo: palavras });
    expect(mensagens).toHaveLength(1);
    expect(resultado).toMatchObject({ tentativas: 1, incompleto: false, descartadosPorLimite: 0, modelo: "claude-opus-5-5" });
    expect(resultado.titulos).toHaveLength(15);
    expect(resultado.descricoes).toHaveLength(4);
    // 1000 × $4 + 500 × $20 por milhão = $0,014
    expect(resultado.custoEstimadoEmDolares).toBeCloseTo(0.014);
  });

  it("textos longos são descartados e o complemento é pedido citando o que estourou", async () => {
    const longo = "Este título é longo demais para o Google";
    const { gerador, mensagens } = criarGeradorFalso([
      { titulos: [...titulosBons(6), longo], descricoes: descricoesBoas(4) },
      { titulos: titulosBons(6, "Extra"), descricoes: [] },
    ]);
    const resultado = await gerarSugestoesDeTitulos(gerador, { anuncio, palavrasDoGrupo: palavras });
    expect(mensagens).toHaveLength(2);
    expect(mensagens[1]).toContain(`"${longo}" (${contarCaracteresVisiveis(longo)})`);
    expect(mensagens[1]).toContain("mais 4 títulos");
    expect(resultado.titulos).toHaveLength(12);
    expect(resultado.titulos).not.toContain(longo);
    expect(resultado.descartadosPorLimite).toBe(1);
    expect(resultado.tokensEntrada).toBe(2000);
  });

  it(`para depois de ${MAXIMO_DE_TENTATIVAS} tentativas e marca como incompleto`, async () => {
    const { gerador, mensagens } = criarGeradorFalso([{ titulos: ["Só Um Título"], descricoes: ["Só uma descrição."] }]);
    const resultado = await gerarSugestoesDeTitulos(gerador, { anuncio, palavrasDoGrupo: palavras });
    expect(mensagens).toHaveLength(MAXIMO_DE_TENTATIVAS);
    expect(resultado.incompleto).toBe(true);
    expect(resultado.titulos).toEqual(["Só Um Título"]);
  });

  it("nunca repete o que o anúncio já tem nem o que já foi aceito", async () => {
    const { gerador } = criarGeradorFalso([
      { titulos: ["Sofá retrátil sob medida!", ...titulosBons(10)], descricoes: [...descricoesBoas(4), anuncio.descricoes[0] ?? ""] },
    ]);
    const resultado = await gerarSugestoesDeTitulos(gerador, { anuncio, palavrasDoGrupo: palavras });
    expect(resultado.titulos.map(normalizarTexto)).not.toContain(normalizarTexto("Sofá Retrátil Sob Medida"));
    expect(resultado.descricoes).not.toContain(anuncio.descricoes[0]);
  });

  it("limita a 15 títulos e 4 descrições", async () => {
    const { gerador } = criarGeradorFalso([{ titulos: titulosBons(25), descricoes: descricoesBoas(9) }]);
    const resultado = await gerarSugestoesDeTitulos(gerador, { anuncio, palavrasDoGrupo: palavras });
    expect(resultado.titulos).toHaveLength(15);
    expect(resultado.descricoes).toHaveLength(4);
  });

  it("falha com mensagem clara se nada válido vier", async () => {
    const { gerador } = criarGeradorFalso([{ titulos: ["x".repeat(40)], descricoes: ["y".repeat(120)] }]);
    await expect(gerarSugestoesDeTitulos(gerador, { anuncio, palavrasDoGrupo: palavras })).rejects.toThrow("limite de caracteres");
  });

  it("critério do PRD: 100% das sugestões exibidas respeitam o limite (respostas aleatórias)", async () => {
    let semente = 42;
    const aleatorio = () => ((semente = (semente * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const textoAleatorio = (max: number, i: number) => `${i} ${"palavra ".repeat(Math.floor(aleatorio() * max))}`.trim();
    for (let rodada = 0; rodada < 30; rodada++) {
      const respostas = Array.from({ length: 3 }, (_, t) => ({
        titulos: Array.from({ length: 15 }, (_, i) => textoAleatorio(7, rodada * 100 + t * 20 + i)),
        descricoes: Array.from({ length: 4 }, (_, i) => textoAleatorio(18, rodada * 100 + t * 20 + i)),
      }));
      const { gerador } = criarGeradorFalso(respostas);
      const resultado = await gerarSugestoesDeTitulos(gerador, { anuncio, palavrasDoGrupo: palavras }).catch(() => null);
      if (!resultado) continue;
      for (const t of resultado.titulos) expect(contarCaracteresVisiveis(t)).toBeLessThanOrEqual(LIMITE_TITULO);
      for (const d of resultado.descricoes) expect(contarCaracteresVisiveis(d)).toBeLessThanOrEqual(LIMITE_DESCRICAO);
    }
  });

  it("o prompt de sistema proíbe inventar preços e pede os limites", async () => {
    const { gerador, sistemas } = criarGeradorFalso([{ titulos: titulosBons(10), descricoes: descricoesBoas(4) }]);
    await gerarSugestoesDeTitulos(gerador, { anuncio, palavrasDoGrupo: palavras });
    expect(sistemas[0]).toContain("Nunca invente preço");
    expect(sistemas[0]).toContain(`no máximo ${LIMITE_TITULO} caracteres`);
  });
});
