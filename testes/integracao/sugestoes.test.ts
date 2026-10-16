import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/api/banco/prisma";
import type { ApiGoogleAds } from "@/api/integracoes/google-ads/api-google-ads";
import { gerarESalvarSugestoesDoAnuncio, listarSugestoesDoAnuncio } from "@/api/servicos/sugestoes";
import { criarGeradorFalso } from "../apoio/claude-falso";

const api: ApiGoogleAds = {
  listarIdsAcessiveis: async () => ["111"],
  consultar: async (_c, gaql) => {
    if (gaql.includes("RESPONSIVE_SEARCH_AD")) {
      return [
        {
          ad_group_ad: { ad: { id: 1, responsive_search_ad: { headlines: [{ text: "Sofás" }], descriptions: [{ text: "Sob medida." }] } }, ad_strength: 5 },
          ad_group: { id: 10, name: "Sofás" },
          campaign: { name: "Pesquisa" },
        },
      ];
    }
    if (gaql.includes("FROM ad_group_criterion")) return [{ ad_group: { id: 10 }, ad_group_criterion: { keyword: { text: "sofá" } } }];
    return [];
  },
};

const conta = {
  api,
  credenciais: { customerId: "111", loginCustomerId: "111", refreshToken: "rt" },
  periodo: 30 as const,
  hoje: new Date(2026, 9, 15),
};

const respostaBoa = {
  titulos: Array.from({ length: 12 }, (_, i) => `Sofá novo ${i + 1}`),
  descricoes: Array.from({ length: 4 }, (_, i) => `Descrição nova ${i + 1}.`),
};

beforeEach(async () => {
  await prisma.sugestao.deleteMany({});
  await prisma.cacheConsulta.deleteMany({});
});
afterAll(async () => {
  await prisma.sugestao.deleteMany({});
  await prisma.cacheConsulta.deleteMany({});
  await prisma.$disconnect();
});

describe("gerarESalvarSugestoesDoAnuncio", () => {
  it("gera, salva no histórico com tokens e devolve a sugestão", async () => {
    const { gerador, mensagens } = criarGeradorFalso([respostaBoa]);
    const resultado = await gerarESalvarSugestoesDoAnuncio({ anuncioId: "10~1", contextoUsuario: "tom acolhedor", gerador, conta });

    expect(resultado?.incompleto).toBe(false);
    expect(resultado?.sugestao).toMatchObject({ contextoUsuario: "tom acolhedor", modelo: "claude-opus-5-5" });
    expect(resultado?.sugestao.titulos).toHaveLength(12);
    expect(mensagens[0]).toContain("sofá");

    const linha = await prisma.sugestao.findFirstOrThrow();
    expect(linha).toMatchObject({ customerId: "111", anuncioId: "10~1", tipo: "TITULOS_DESCRICOES", tokensEntrada: 1000, tokensSaida: 500 });
  });

  it("anúncio inexistente devolve null e não chama a IA", async () => {
    const { gerador, mensagens } = criarGeradorFalso([respostaBoa]);
    expect(await gerarESalvarSugestoesDoAnuncio({ anuncioId: "10~999", contextoUsuario: null, gerador, conta })).toBeNull();
    expect(mensagens).toHaveLength(0);
    expect(await prisma.sugestao.count()).toBe(0);
  });
});

describe("listarSugestoesDoAnuncio (histórico F4.5)", () => {
  it("lista só as do anúncio, da mais nova para a mais antiga, com custo estimado", async () => {
    const { gerador } = criarGeradorFalso([respostaBoa]);
    await gerarESalvarSugestoesDoAnuncio({ anuncioId: "10~1", contextoUsuario: "primeira", gerador, conta });
    await new Promise((r) => setTimeout(r, 5));
    await gerarESalvarSugestoesDoAnuncio({ anuncioId: "10~1", contextoUsuario: "segunda", gerador, conta });
    await prisma.sugestao.create({
      data: { customerId: "111", anuncioId: "10~2", tipo: "TITULOS_DESCRICOES", resultadoJson: "{}", modelo: "x", tokensEntrada: 0, tokensSaida: 0 },
    });

    const historico = await listarSugestoesDoAnuncio("111", "10~1");
    expect(historico.map((s) => s.contextoUsuario)).toEqual(["segunda", "primeira"]);
    expect(historico[0]?.custoEstimadoEmDolares).toBeCloseTo(0.014);
  });

  it("linha com JSON fora do formato vira listas vazias (não quebra a tela)", async () => {
    await prisma.sugestao.create({
      data: { customerId: "111", anuncioId: "10~1", tipo: "TITULOS_DESCRICOES", resultadoJson: '{"outra":1}', modelo: "x", tokensEntrada: 0, tokensSaida: 0 },
    });
    const [s] = await listarSugestoesDoAnuncio("111", "10~1");
    expect(s).toMatchObject({ titulos: [], descricoes: [], custoEstimadoEmDolares: null });
  });
});
