import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/api/banco/prisma";
import { consultarComCache, montarChaveDoCache, VALIDADE_DO_CACHE_MS } from "@/api/servicos/cache";

beforeEach(() => prisma.cacheConsulta.deleteMany({}));
afterAll(async () => {
  await prisma.cacheConsulta.deleteMany({});
  await prisma.$disconnect();
});

function contadorDeBuscas<T>(valor: T) {
  let vezes = 0;
  return {
    buscar: async () => {
      vezes += 1;
      return valor;
    },
    vezes: () => vezes,
  };
}

describe("montarChaveDoCache", () => {
  it("começa pela conta e ignora diferenças de espaço na consulta", () => {
    const a = montarChaveDoCache("111", "SELECT  campaign.id\n FROM campaign");
    const b = montarChaveDoCache("111", "SELECT campaign.id FROM campaign");
    expect(a).toBe(b);
    expect(a.startsWith("111:")).toBe(true);
  });

  it("consultas ou contas diferentes geram chaves diferentes", () => {
    expect(montarChaveDoCache("111", "A")).not.toBe(montarChaveDoCache("111", "B"));
    expect(montarChaveDoCache("111", "A")).not.toBe(montarChaveDoCache("222", "A"));
  });
});

describe("consultarComCache", () => {
  const inicio = new Date("2026-10-15T12:00:00Z");

  it("busca uma vez e reaproveita dentro de 15 minutos", async () => {
    const fonte = contadorDeBuscas([{ cliques: 10 }]);
    const primeiro = await consultarComCache({ chave: "111:a", buscar: fonte.buscar, agora: inicio });
    const segundo = await consultarComCache({
      chave: "111:a",
      buscar: fonte.buscar,
      agora: new Date(inicio.getTime() + VALIDADE_DO_CACHE_MS - 1000),
    });
    expect(primeiro).toEqual([{ cliques: 10 }]);
    expect(segundo).toEqual([{ cliques: 10 }]);
    expect(fonte.vezes()).toBe(1);
  });

  it("busca de novo depois que expira", async () => {
    const fonte = contadorDeBuscas("dado");
    await consultarComCache({ chave: "111:a", buscar: fonte.buscar, agora: inicio });
    await consultarComCache({
      chave: "111:a",
      buscar: fonte.buscar,
      agora: new Date(inicio.getTime() + VALIDADE_DO_CACHE_MS + 1),
    });
    expect(fonte.vezes()).toBe(2);
  });

  it("forcarAtualizacao ignora o cache e grava o valor novo", async () => {
    await consultarComCache({ chave: "111:a", buscar: async () => "velho", agora: inicio });
    const novo = await consultarComCache({ chave: "111:a", buscar: async () => "novo", forcarAtualizacao: true, agora: inicio });
    const depois = await consultarComCache({ chave: "111:a", buscar: async () => "nunca", agora: inicio });
    expect(novo).toBe("novo");
    expect(depois).toBe("novo");
  });

  it("não guarda nada se a busca falhar", async () => {
    await expect(
      consultarComCache({
        chave: "111:a",
        buscar: async () => {
          throw new Error("Google fora");
        },
      }),
    ).rejects.toThrow("Google fora");
    expect(await prisma.cacheConsulta.count()).toBe(0);
  });
});
