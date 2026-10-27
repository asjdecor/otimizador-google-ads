import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/api/banco/prisma";
import { ErroParaUsuario } from "@/api/erro-para-usuario";
import type { GeradorDeTexto } from "@/api/integracoes/claude/cliente";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "@/api/integracoes/google-ads/api-google-ads";
import type { PedidoDeIdeias } from "@/api/integracoes/google-ads/planejador";
import type { PontoDePartida } from "@/api/servicos/esquema-pesquisa-de-mercado";
import {
  executarEtapa,
  iniciarPesquisa,
  lerPesquisa,
  lerUltimaPesquisa,
  montarPontoDePartida,
  type ContextoProntoDaConta,
} from "@/api/servicos/pesquisa-de-mercado";
import { criarGeradorFalso } from "../apoio/claude-falso";

const credenciais: CredenciaisDeConsulta = { customerId: "111", loginCustomerId: null, refreshToken: "rt" };

const ponto: PontoDePartida = {
  dominio: "minhaloja.com.br",
  palavras: ["sofá retrátil", "sofá cama"],
  idsGeo: [],
  nomesGeo: [],
  idiomas: ["1014"],
};

const respostaConcorrentes = {
  concorrentes: [
    { nome: "Minha Loja", site: "https://www.minhaloja.com.br", motivo: "É a própria conta." },
    { nome: "Sofás Rivais", site: "sofasrivais.com.br", motivo: "Vende sofás retráteis." },
    { nome: "Casa Boa", site: "https://casaboa.com.br/sofas", motivo: "Loja de móveis." },
    { nome: "Mercado Livre", site: "mercadolivre.com.br", motivo: "Marketplace." },
  ],
};

const relatorio = (site: string) => ({
  site,
  lido: true,
  oQueVende: "Sofás",
  promessas: ["Entrega rápida"],
  precos: ["R$ 1.999"],
  diferenciais: [],
  pontosFracos: [],
  fontes: [`https://${site}/`],
});
const respostaSites = { relatorios: [relatorio("sofasrivais.com.br"), relatorio("casaboa.com.br")] };

const respostaRecomendacao = {
  palavras: [
    { texto: "sofá retrátil barato", correspondencia: "FRASE", motivo: "Muita busca." },
    { texto: "sofá cama casal", correspondencia: "EXATA", motivo: "Intenção de compra." },
    { texto: "palavra inventada", correspondencia: "EXATA", motivo: "Não veio do Planejador." },
  ],
  negativas: [{ termo: "grátis", motivo: "Sem intenção de compra." }],
};

const ideia = (texto: string, volume: number | null) => ({
  text: texto,
  keyword_idea_metrics: { avg_monthly_searches: volume, competition: "LOW", low_top_of_page_bid_micros: 500_000, high_top_of_page_bid_micros: 2_000_000 },
});

/** Google falso: `ideias` decide a resposta do Planejador por chamada (pode lançar). */
function criarApi(opcoes: { ideias?: (pedido: PedidoDeIdeias, chamada: number) => unknown; linhas?: (gaql: string) => unknown[] } = {}) {
  const pedidos: PedidoDeIdeias[] = [];
  const api: ApiGoogleAds = {
    listarIdsAcessiveis: async () => ["111"],
    consultar: async (_c, gaql) => opcoes.linhas?.(gaql) ?? [],
    gerarIdeiasDePalavras: async (_c, pedido) => {
      pedidos.push(pedido);
      const resposta = opcoes.ideias
        ? opcoes.ideias(pedido, pedidos.length)
        : pedidos.length === 1
          ? { results: [ideia("sofá retrátil barato", 900), ideia("sofá cama casal", 400)] }
          : { results: [ideia("Sofá Retrátil Barato", 1200)] }; // repetida em outra semente: fica a de maior volume
      if (resposta instanceof Error) throw resposta;
      return resposta;
    },
  };
  return { api, pedidos };
}

function geradorQueFalha(erro: Error): GeradorDeTexto {
  return {
    gerarJson: async () => {
      throw erro;
    },
    pesquisarNaWeb: async () => {
      throw erro;
    },
  };
}

beforeEach(async () => {
  await prisma.pesquisaMercado.deleteMany({});
});
afterAll(async () => {
  await prisma.pesquisaMercado.deleteMany({});
  await prisma.$disconnect();
});

describe("pesquisa de mercado em etapas", () => {
  it("faz as 4 etapas e conclui com concorrentes filtrados, palavras com volume e custo", async () => {
    const { api, pedidos } = criarApi();
    const { gerador, mensagens, sistemas, pesquisas } = criarGeradorFalso([respostaConcorrentes, respostaSites, respostaRecomendacao]);
    const deps = { gerador, api, credenciais };

    const inicial = await iniciarPesquisa("111", ponto);
    expect(inicial).toMatchObject({ etapa: "CONCORRENTES", erroEtapa: null, custoDolares: 0, concorrentes: null, pontoDePartida: ponto });

    const aposConcorrentes = await executarEtapa(deps, inicial.id, "CONCORRENTES");
    expect(aposConcorrentes.etapa).toBe("SITES");
    expect(aposConcorrentes.concorrentes?.map((c) => c.dominio)).toEqual(["sofasrivais.com.br", "casaboa.com.br"]);
    expect(pesquisas[0]).toMatchObject({ maxBuscas: 8, maxLeituras: 0 });
    expect(mensagens[0]).toContain("<ponto_de_partida>");
    expect(mensagens[0]).toContain("Brasil");
    expect(mensagens[0]).toContain("sofá retrátil");
    expect(sistemas[0]).toMatch(/DADO/);

    const aposSites = await executarEtapa(deps, inicial.id, "SITES");
    expect(aposSites.etapa).toBe("VOLUMES");
    expect(pesquisas[1]).toMatchObject({ maxBuscas: 0, maxLeituras: 4 });
    expect(sistemas[1]).toMatch(/nunca/i);
    expect(aposSites.relatorios?.map((r) => [r.dominio, r.lido])).toEqual([
      ["sofasrivais.com.br", true],
      ["casaboa.com.br", true],
    ]);

    const aposVolumes = await executarEtapa(deps, inicial.id, "VOLUMES");
    expect(aposVolumes.etapa).toBe("RECOMENDACAO");
    expect(pedidos.map((p) => p.urlSemente)).toEqual(["https://minhaloja.com.br", "https://sofasrivais.com.br", "https://casaboa.com.br"]);
    expect(pedidos[0]).toMatchObject({ palavrasSemente: [], idsGeo: ["2076"], idioma: "1014" });
    expect(aposVolumes.volumes).toMatchObject({ disponivel: true });
    if (aposVolumes.volumes?.disponivel) {
      expect(aposVolumes.volumes.ideias.map((i) => [i.texto, i.volumeMensal])).toEqual([
        ["Sofá Retrátil Barato", 1200],
        ["sofá cama casal", 400],
      ]);
    }

    const final = await executarEtapa(deps, inicial.id, "RECOMENDACAO");
    expect(final.etapa).toBe("CONCLUIDA");
    expect(final.erroEtapa).toBeNull();
    expect(mensagens[2]).toContain("Sofá Retrátil Barato");
    expect(final.recomendadas?.map((p) => [p.texto, p.volumeMensal])).toEqual([
      ["Sofá Retrátil Barato", 1200],
      ["sofá cama casal", 400],
    ]);
    expect(final.negativas?.map((n) => n.termo)).toEqual(["grátis"]);
    expect(final.custoDolares).toBeGreaterThan(0);
    expect(final.custoDolares).toBeGreaterThan(aposSites.custoDolares);

    expect((await lerUltimaPesquisa("111"))?.etapa).toBe("CONCLUIDA");
  });

  it("recusa uma etapa fora de ordem", async () => {
    const { api } = criarApi();
    const { gerador } = criarGeradorFalso([respostaConcorrentes]);
    const pesquisa = await iniciarPesquisa("111", ponto);
    await expect(executarEtapa({ gerador, api, credenciais }, pesquisa.id, "SITES")).rejects.toThrow(
      "Esta etapa já foi feita ou ainda não pode ser feita. Recarregue a página.",
    );
  });

  it("não roda a mesma etapa duas vezes ao mesmo tempo", async () => {
    const { api } = criarApi();
    const falso = criarGeradorFalso([respostaConcorrentes]);
    const lento: GeradorDeTexto = {
      gerarJson: falso.gerador.gerarJson,
      pesquisarNaWeb: async (pedido) => {
        await new Promise((r) => setTimeout(r, 50));
        return falso.gerador.pesquisarNaWeb(pedido);
      },
    };
    const pesquisa = await iniciarPesquisa("111", ponto);
    const resultados = await Promise.allSettled([
      executarEtapa({ gerador: lento, api, credenciais }, pesquisa.id, "CONCORRENTES"),
      executarEtapa({ gerador: lento, api, credenciais }, pesquisa.id, "CONCORRENTES"),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const recusada = resultados.find((r) => r.status === "rejected");
    expect(recusada?.status === "rejected" && String(recusada.reason)).toContain("já está rodando");
    expect(falso.pesquisas).toHaveLength(1);
    const salva = await lerPesquisa(pesquisa.id, "111");
    expect(salva?.etapa).toBe("SITES");
  });

  it("guarda o erro de uma etapa, mantém o que já foi feito e deixa tentar de novo", async () => {
    const { api } = criarApi();
    const pesquisa = await iniciarPesquisa("111", ponto);
    await executarEtapa({ gerador: criarGeradorFalso([respostaConcorrentes]).gerador, api, credenciais }, pesquisa.id, "CONCORRENTES");

    const falhou = await executarEtapa(
      { gerador: geradorQueFalha(new ErroParaUsuario("A IA demorou demais. Tente de novo.")), api, credenciais },
      pesquisa.id,
      "SITES",
    );
    expect(falhou.etapa).toBe("SITES");
    expect(falhou.erroEtapa).toBe("A IA demorou demais. Tente de novo.");
    expect(falhou.concorrentes).toHaveLength(2);

    const desconhecido = await executarEtapa({ gerador: geradorQueFalha(new Error("socket hang up")), api, credenciais }, pesquisa.id, "SITES");
    expect(desconhecido.erroEtapa).toBe("Não foi possível concluir esta etapa. Tente de novo.");

    const deNovo = await executarEtapa({ gerador: criarGeradorFalso([respostaSites]).gerador, api, credenciais }, pesquisa.id, "SITES");
    expect(deNovo.etapa).toBe("VOLUMES");
    expect(deNovo.erroEtapa).toBeNull();
    expect(deNovo.relatorios).toHaveLength(2);
  });

  it("não avança quando a IA não encontra concorrentes", async () => {
    const { api } = criarApi();
    const pesquisa = await iniciarPesquisa("111", ponto);
    const { gerador } = criarGeradorFalso([{ concorrentes: [{ nome: "Própria", site: "minhaloja.com.br", motivo: "" }] }]);
    const resultado = await executarEtapa({ gerador, api, credenciais }, pesquisa.id, "CONCORRENTES");
    expect(resultado.etapa).toBe("CONCORRENTES");
    expect(resultado.erroEtapa).toBe("Não encontramos concorrentes. Confira se a conta tem anúncios ativos com URL.");
    expect(resultado.custoDolares).toBeGreaterThan(0);
  });

  it("sem Planejador, a etapa de volumes termina indisponível e as palavras saem sem volume", async () => {
    const { api, pedidos } = criarApi({ ideias: () => new Error("USER_PERMISSION_DENIED") });
    const { gerador, mensagens } = criarGeradorFalso([respostaConcorrentes, respostaSites, respostaRecomendacao]);
    const deps = { gerador, api, credenciais };
    const pesquisa = await iniciarPesquisa("111", ponto);
    await executarEtapa(deps, pesquisa.id, "CONCORRENTES");
    await executarEtapa(deps, pesquisa.id, "SITES");

    const aposVolumes = await executarEtapa(deps, pesquisa.id, "VOLUMES");
    expect(pedidos).toHaveLength(1);
    expect(aposVolumes.etapa).toBe("RECOMENDACAO");
    expect(aposVolumes.volumes).toEqual({
      disponivel: false,
      motivo: "Sua conta Google não tem permissão nessa conta de anúncios (ou falta passar pela MCC certa).",
    });

    const final = await executarEtapa(deps, pesquisa.id, "RECOMENDACAO");
    expect(final.etapa).toBe("CONCLUIDA");
    expect(mensagens[2]).toContain("Entrega rápida");
    expect(final.recomendadas?.length).toBeGreaterThan(0);
    expect(final.recomendadas?.every((p) => p.volumeMensal === null)).toBe(true);
  });

  it("pula a semente que falha depois da primeira e segue com as outras", async () => {
    const { api, pedidos } = criarApi({
      ideias: (_p, chamada) => (chamada === 2 ? new Error("INTERNAL") : { results: [ideia(`ideia ${chamada}`, chamada * 10)] }),
    });
    const { gerador } = criarGeradorFalso([respostaConcorrentes, respostaSites]);
    const deps = { gerador, api, credenciais };
    const pesquisa = await iniciarPesquisa("111", ponto);
    await executarEtapa(deps, pesquisa.id, "CONCORRENTES");
    await executarEtapa(deps, pesquisa.id, "SITES");
    const resultado = await executarEtapa(deps, pesquisa.id, "VOLUMES");
    expect(pedidos).toHaveLength(3);
    expect(resultado.volumes?.disponivel && resultado.volumes.ideias.map((i) => i.texto)).toEqual(["ideia 3", "ideia 1"]);
  });
});

describe("montarPontoDePartida", () => {
  it("conta sem segmentação: sem regiões e com as 20 palavras de maior custo", async () => {
    const palavras = Array.from({ length: 25 }, (_, i) => ({
      ad_group_criterion: { criterion_id: i, keyword: { text: `palavra ${i}`, match_type: 2 } },
      ad_group: { id: 1, name: "Grupo" },
      campaign: { name: "Campanha" },
      metrics: { impressions: 10, clicks: 1, cost_micros: i * 1_000_000 },
    }));
    const { api } = criarApi({
      linhas: (gaql) => {
        if (gaql.includes("FROM keyword_view")) return palavras;
        if (gaql.includes("final_urls")) return [{ ad_group_ad: { ad: { final_urls: ["https://www.MinhaLoja.com.br/sofas"] } } }];
        return [];
      },
    });
    const conta: ContextoProntoDaConta = {
      tipo: "pronto",
      conta: { customerId: "111", nome: "Loja", moeda: "BRL", ehGerente: false, selecionada: true, loginCustomerId: null },
      periodo: 30,
      configuracao: { limiteDesperdicio: 50, periodoPadrao: 30 },
      api,
      credenciais,
    };
    const resultado = await montarPontoDePartida(conta);
    expect(resultado.idsGeo).toEqual([]);
    expect(resultado.nomesGeo).toEqual([]);
    expect(resultado.idiomas).toEqual(["1014"]);
    expect(resultado.dominio).toBe("minhaloja.com.br");
    expect(resultado.palavras).toHaveLength(20);
    expect(resultado.palavras[0]).toBe("palavra 24");
    expect(resultado.palavras.at(-1)).toBe("palavra 5");
  });
});

describe("leitura da pesquisa", () => {
  it("não devolve a pesquisa de outra conta", async () => {
    const pesquisa = await iniciarPesquisa("111", ponto);
    expect(await lerPesquisa(pesquisa.id, "222")).toBeNull();
    expect((await lerPesquisa(pesquisa.id, "111"))?.id).toBe(pesquisa.id);
    expect(await lerUltimaPesquisa("222")).toBeNull();
  });
});
