import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroParaUsuario } from "@/api/erro-para-usuario";

const carregarContextoDaConta = vi.fn();
const iaConfiguradaNoAmbiente = vi.fn();
const montarPontoDePartida = vi.fn();
const iniciarPesquisa = vi.fn();
const executarEtapa = vi.fn();
const lerPesquisa = vi.fn();

vi.mock("@/api/http/contexto-da-conta", () => ({ carregarContextoDaConta: () => carregarContextoDaConta() }));
vi.mock("@/api/integracoes/fabrica", () => ({
  criarGeradorDoAmbiente: () => ({ gerador: true }),
  iaConfiguradaNoAmbiente: () => iaConfiguradaNoAmbiente(),
}));
vi.mock("@/api/servicos/pesquisa-de-mercado", () => ({
  montarPontoDePartida: (...argumentos: unknown[]) => montarPontoDePartida(...argumentos),
  iniciarPesquisa: (...argumentos: unknown[]) => iniciarPesquisa(...argumentos),
  executarEtapa: (...argumentos: unknown[]) => executarEtapa(...argumentos),
  lerPesquisa: (...argumentos: unknown[]) => lerPesquisa(...argumentos),
}));

import { POST as iniciar } from "@/app/api/pesquisa/route";
import { POST as etapa } from "@/app/api/pesquisa/[id]/etapa/route";

const conta = {
  tipo: "pronto",
  conta: { customerId: "123" },
  api: {},
  credenciais: { customerId: "123", refreshToken: "t" },
};

function requisicao(corpo: unknown, origem: string | null = "http://localhost:3000"): Request {
  const cabecalhos = new Headers({ host: "localhost:3000", "content-type": "application/json" });
  if (origem) cabecalhos.set("origin", origem);
  return new Request("http://localhost:3000/api/pesquisa", { method: "POST", headers: cabecalhos, body: JSON.stringify(corpo) });
}

const parametros = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  iaConfiguradaNoAmbiente.mockReturnValue(true);
  carregarContextoDaConta.mockResolvedValue(conta);
});

describe("POST /api/pesquisa", () => {
  it("barra origem diferente com 403", async () => {
    const resposta = await iniciar(requisicao({}, "http://outro-site.com"));
    expect(resposta.status).toBe(403);
  });

  it("avisa quando a IA não está configurada", async () => {
    iaConfiguradaNoAmbiente.mockReturnValue(false);
    const resposta = await iniciar(requisicao({}));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro).toBe("Preencha ANTHROPIC_API_KEY no .env para pesquisar.");
  });

  it("devolve a pesquisa criada", async () => {
    montarPontoDePartida.mockResolvedValue({ ponto: true });
    iniciarPesquisa.mockResolvedValue({ id: "p1" });
    const resposta = await iniciar(requisicao({}));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ pesquisa: { id: "p1" } });
    expect(iniciarPesquisa).toHaveBeenCalledWith("123", { ponto: true });
  });

  it("falha do Google ao montar o ponto de partida sai como 502", async () => {
    montarPontoDePartida.mockRejectedValue(new Error("boom"));
    const resposta = await iniciar(requisicao({}));
    expect(resposta.status).toBe(502);
  });
});

describe("POST /api/pesquisa/[id]/etapa", () => {
  it("barra origem diferente com 403", async () => {
    const resposta = await etapa(requisicao({ etapa: "CONCORRENTES" }, "http://outro-site.com"), parametros("p1"));
    expect(resposta.status).toBe(403);
  });

  it("rejeita etapa fora de ETAPAS com 400", async () => {
    const resposta = await etapa(requisicao({ etapa: "OUTRA" }), parametros("p1"));
    expect(resposta.status).toBe(400);
  });

  it("avisa quando a IA não está configurada", async () => {
    iaConfiguradaNoAmbiente.mockReturnValue(false);
    const resposta = await etapa(requisicao({ etapa: "CONCORRENTES" }), parametros("p1"));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro).toBe("Preencha ANTHROPIC_API_KEY no .env para pesquisar.");
  });

  it("pesquisa de outra conta dá 404", async () => {
    lerPesquisa.mockResolvedValue(null);
    const resposta = await etapa(requisicao({ etapa: "CONCORRENTES" }), parametros("alheia"));
    expect(resposta.status).toBe(404);
    expect((await resposta.json()).erro).toBe("Pesquisa não encontrada.");
    expect(lerPesquisa).toHaveBeenCalledWith("alheia", "123");
    expect(executarEtapa).not.toHaveBeenCalled();
  });

  it("conflito de ordem ou trava vira 409 com a mensagem", async () => {
    lerPesquisa.mockResolvedValue({ id: "p1" });
    executarEtapa.mockRejectedValue(new ErroParaUsuario("já está rodando em outra aba"));
    const resposta = await etapa(requisicao({ etapa: "SITES" }), parametros("p1"));
    expect(resposta.status).toBe(409);
    expect((await resposta.json()).erro).toBe("já está rodando em outra aba");
  });

  it("devolve a pesquisa atualizada", async () => {
    lerPesquisa.mockResolvedValue({ id: "p1" });
    executarEtapa.mockResolvedValue({ id: "p1", etapa: "SITES" });
    const resposta = await etapa(requisicao({ etapa: "CONCORRENTES" }), parametros("p1"));
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ pesquisa: { id: "p1", etapa: "SITES" } });
    expect(executarEtapa).toHaveBeenCalledWith(expect.objectContaining({ api: conta.api, credenciais: conta.credenciais }), "p1", "CONCORRENTES");
  });

  it("erro inesperado vira 502", async () => {
    lerPesquisa.mockResolvedValue({ id: "p1" });
    executarEtapa.mockRejectedValue(new Error("boom"));
    const resposta = await etapa(requisicao({ etapa: "CONCORRENTES" }), parametros("p1"));
    expect(resposta.status).toBe(502);
  });
});
