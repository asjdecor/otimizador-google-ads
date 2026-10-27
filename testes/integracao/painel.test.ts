import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/api/banco/prisma";
import type { ApiGoogleAds } from "@/api/integracoes/google-ads/api-google-ads";
import { lerConfiguracaoDoApp, salvarLimiteDeDesperdicio } from "@/api/servicos/configuracao";
import { carregarDadosDoPainel } from "@/api/servicos/painel";

const reais = (valor: number) => valor * 1_000_000;

/** Google falso que responde conforme a tabela consultada no GAQL. */
function criarApiComMetricas() {
  const gaqls: string[] = [];
  const api: ApiGoogleAds = {
    listarIdsAcessiveis: async () => ["111"],
    gerarIdeiasDePalavras: async () => ({ results: [] }),
    consultar: async (_credenciais, gaql) => {
      gaqls.push(gaql);
      if (gaql.includes("FROM campaign")) {
        return [
          { campaign: { id: 1, name: "Pequena", status: 2 }, metrics: { impressions: 100, clicks: 10, cost_micros: reais(20), conversions: 1 } },
          { campaign: { id: 2, name: "Grande", status: 3 }, metrics: { impressions: 900, clicks: 40, cost_micros: reais(180), conversions: 0 } },
        ];
      }
      if (gaql.includes("FROM keyword_view")) {
        return [
          {
            ad_group_criterion: { criterion_id: 1, keyword: { text: "sofá grátis", match_type: 4 } },
            ad_group: { id: 10, name: "Sofás" },
            campaign: { name: "Grande" },
            metrics: { impressions: 500, clicks: 30, cost_micros: reais(120), conversions: 0 },
          },
          {
            ad_group_criterion: { criterion_id: 2, keyword: { text: "sofá retrátil", match_type: 2 } },
            ad_group: { id: 10, name: "Sofás" },
            campaign: { name: "Grande" },
            metrics: { impressions: 400, clicks: 10, cost_micros: reais(30), conversions: 0 },
          },
        ];
      }
      return [
        { ad_group_ad: { ad: { id: 1 } }, ad_group: { id: 10 }, metrics: { impressions: 1000, clicks: 90 } },
        { ad_group_ad: { ad: { id: 2 } }, ad_group: { id: 10 }, metrics: { impressions: 1000, clicks: 10 } },
      ];
    },
  };
  return { api, gaqls };
}

const credenciais = { customerId: "111", loginCustomerId: "111", refreshToken: "rt" };

beforeEach(async () => {
  await prisma.cacheConsulta.deleteMany({});
  await prisma.configuracao.deleteMany({});
});
afterAll(async () => {
  await prisma.cacheConsulta.deleteMany({});
  await prisma.configuracao.deleteMany({});
  await prisma.$disconnect();
});

describe("carregarDadosDoPainel", () => {
  it("monta totais, campanhas e as listas de desperdício", async () => {
    const { api } = criarApiComMetricas();
    const dados = await carregarDadosDoPainel({
      api,
      credenciais,
      periodo: 30,
      limiteDesperdicio: 50,
      hoje: new Date(2026, 9, 15),
    });

    expect(dados.intervalo).toEqual({ inicio: "2026-09-15", fim: "2026-10-14" });
    expect(dados.totais).toMatchObject({ impressoes: 1000, cliques: 50, custo: 200, conversoes: 1 });
    expect(dados.totais.ctr).toBeCloseTo(0.05);
    expect(dados.totais.cpcMedio).toBeCloseTo(4);
    expect(dados.totais.custoPorConversao).toBeCloseTo(200);
    expect(dados.campanhas.map((c) => c.nome)).toEqual(["Grande", "Pequena"]);
    expect(dados.campanhas[0]?.custoPorConversao).toBeNull();

    expect(dados.palavrasQueDesperdicam.map((p) => p.texto)).toEqual(["sofá grátis"]);
    expect(dados.gastoSemConversao).toBeCloseTo(150);
    expect(dados.anunciosComCtrBaixo.map((a) => a.anuncioId)).toEqual(["2"]);
  });

  it("segunda leitura dentro de 15 min vem do cache (sem chamar o Google)", async () => {
    const { api, gaqls } = criarApiComMetricas();
    const entrada = { api, credenciais, periodo: 30 as const, limiteDesperdicio: 50, hoje: new Date(2026, 9, 15) };
    await carregarDadosDoPainel(entrada);
    await carregarDadosDoPainel(entrada);
    expect(gaqls).toHaveLength(3);
  });

  it("mudar o limite não exige nova consulta (regra roda sobre o cache)", async () => {
    const { api, gaqls } = criarApiComMetricas();
    const base = { api, credenciais, periodo: 30 as const, hoje: new Date(2026, 9, 15) };
    await carregarDadosDoPainel({ ...base, limiteDesperdicio: 50 });
    const dados = await carregarDadosDoPainel({ ...base, limiteDesperdicio: 20 });
    expect(dados.palavrasQueDesperdicam.map((p) => p.texto)).toEqual(["sofá grátis", "sofá retrátil"]);
    expect(gaqls).toHaveLength(3);
  });

  it("período diferente faz consulta nova", async () => {
    const { api, gaqls } = criarApiComMetricas();
    const base = { api, credenciais, limiteDesperdicio: 50, hoje: new Date(2026, 9, 15) };
    await carregarDadosDoPainel({ ...base, periodo: 30 });
    await carregarDadosDoPainel({ ...base, periodo: 7 });
    expect(gaqls).toHaveLength(6);
  });
});

describe("configuração do app", () => {
  it("começa com os padrões (R$ 50, 30 dias) e sem tetos de campanha", async () => {
    expect(await lerConfiguracaoDoApp()).toMatchObject({
      limiteDesperdicio: 50,
      periodoPadrao: 30,
      orcamentoMaximoPorCampanha: null,
      orcamentoMaximoTotal: null,
    });
  });

  it("salva o limite e recusa valores inválidos", async () => {
    await salvarLimiteDeDesperdicio(120);
    expect((await lerConfiguracaoDoApp()).limiteDesperdicio).toBe(120);
    await expect(salvarLimiteDeDesperdicio(-1)).rejects.toThrow("inteiro");
    await expect(salvarLimiteDeDesperdicio(10.5)).rejects.toThrow("inteiro");
    await expect(salvarLimiteDeDesperdicio(2_000_000)).rejects.toThrow("inteiro");
    expect((await lerConfiguracaoDoApp()).limiteDesperdicio).toBe(120);
  });
});
