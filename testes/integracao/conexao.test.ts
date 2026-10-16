import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/api/banco/prisma";
import { limparCacheDaConta } from "@/api/servicos/cache";
import {
  concluirConexaoGoogle,
  desconectarGoogle,
  lerRefreshTokenSalvo,
  obterEstadoDaConexao,
  salvarConexaoGoogle,
  selecionarContaAds,
  sincronizarContasSalvas,
} from "@/api/servicos/conexao";
import { criarApiGoogleAdsFalsa, criarProvedorOAuthFalso } from "../apoio/google-falso";

async function limparBanco() {
  await prisma.cacheConsulta.deleteMany({});
  await prisma.conexaoGoogle.deleteMany({});
}

const conta = (customerId: string, ehGerente = false) => ({
  customerId,
  nome: `Conta ${customerId}`,
  moeda: "BRL",
  ehGerente,
  loginCustomerId: "900",
});

beforeEach(limparBanco);
afterAll(async () => {
  await limparBanco();
  await prisma.$disconnect();
});

describe("salvarConexaoGoogle", () => {
  it("guarda o refresh token criptografado e lê de volta", async () => {
    await salvarConexaoGoogle({ email: "eu@x.com", refreshToken: "1//segredo" });
    const linha = await prisma.conexaoGoogle.findFirstOrThrow();
    expect(linha.refreshTokenCriptografado).not.toContain("segredo");
    expect(await lerRefreshTokenSalvo()).toBe("1//segredo");
  });

  it("reconectar o mesmo e-mail atualiza o token", async () => {
    await salvarConexaoGoogle({ email: "eu@x.com", refreshToken: "velho" });
    await salvarConexaoGoogle({ email: "eu@x.com", refreshToken: "novo" });
    expect(await prisma.conexaoGoogle.count()).toBe(1);
    expect(await lerRefreshTokenSalvo()).toBe("novo");
  });

  it("conectar outro e-mail substitui o anterior e limpa contas e cache", async () => {
    await salvarConexaoGoogle({ email: "a@x.com", refreshToken: "a" });
    await sincronizarContasSalvas([conta("111")]);
    await prisma.cacheConsulta.create({ data: { chave: "111:x", json: "[]", expiraEm: new Date(Date.now() + 60_000) } });

    await salvarConexaoGoogle({ email: "b@x.com", refreshToken: "b" });
    expect((await prisma.conexaoGoogle.findMany()).map((c) => c.email)).toEqual(["b@x.com"]);
    expect(await prisma.contaAds.count()).toBe(0);
    expect(await prisma.cacheConsulta.count()).toBe(0);
  });
});

describe("sincronizarContasSalvas", () => {
  beforeEach(() => salvarConexaoGoogle({ email: "eu@x.com", refreshToken: "rt" }));

  it("seleciona a primeira conta que não é MCC", async () => {
    await sincronizarContasSalvas([conta("900", true), conta("111"), conta("222")]);
    const estado = await obterEstadoDaConexao();
    expect(estado.conectado && estado.contaSelecionada?.customerId).toBe("111");
  });

  it("mantém a seleção anterior se ela ainda existir", async () => {
    await sincronizarContasSalvas([conta("111"), conta("222")]);
    await selecionarContaAds("222");
    await sincronizarContasSalvas([conta("111"), conta("222"), conta("333")]);
    const estado = await obterEstadoDaConexao();
    expect(estado.conectado && estado.contaSelecionada?.customerId).toBe("222");
  });

  it("remove contas que sumiram e escolhe outra se a selecionada sumiu", async () => {
    await sincronizarContasSalvas([conta("111"), conta("222")]);
    await selecionarContaAds("222");
    await sincronizarContasSalvas([conta("111")]);
    const estado = await obterEstadoDaConexao();
    expect(estado.conectado && estado.contas.map((c) => c.customerId)).toEqual(["111"]);
    expect(estado.conectado && estado.contaSelecionada?.customerId).toBe("111");
  });

  it("sem contas de anúncios, nenhuma fica selecionada", async () => {
    await sincronizarContasSalvas([conta("900", true)]);
    const estado = await obterEstadoDaConexao();
    expect(estado.conectado && estado.contaSelecionada).toBeNull();
  });

  it("guarda o login (MCC) de cada conta", async () => {
    await sincronizarContasSalvas([conta("111")]);
    expect((await prisma.contaAds.findFirstOrThrow()).loginCustomerId).toBe("900");
  });
});

describe("selecionarContaAds", () => {
  beforeEach(async () => {
    await salvarConexaoGoogle({ email: "eu@x.com", refreshToken: "rt" });
    await sincronizarContasSalvas([conta("900", true), conta("111"), conta("222")]);
  });

  it("deixa só uma conta selecionada", async () => {
    await selecionarContaAds("222");
    expect((await prisma.contaAds.findMany({ where: { selecionada: true } })).map((c) => c.customerId)).toEqual(["222"]);
  });

  it("recusa MCC e conta inexistente", async () => {
    await expect(selecionarContaAds("900")).rejects.toThrow("MCC");
    await expect(selecionarContaAds("999")).rejects.toThrow("não encontrada");
  });
});

describe("desconectarGoogle", () => {
  it("apaga conexão, contas e cache e devolve o token para revogar", async () => {
    await salvarConexaoGoogle({ email: "eu@x.com", refreshToken: "rt" });
    await sincronizarContasSalvas([conta("111")]);
    await prisma.cacheConsulta.create({ data: { chave: "111:x", json: "[]", expiraEm: new Date(Date.now() + 60_000) } });

    expect(await desconectarGoogle()).toBe("rt");
    expect(await prisma.conexaoGoogle.count()).toBe(0);
    expect(await prisma.contaAds.count()).toBe(0);
    expect(await prisma.cacheConsulta.count()).toBe(0);
    expect(await obterEstadoDaConexao()).toEqual({ conectado: false });
  });

  it("sem conexão, devolve null", async () => {
    expect(await desconectarGoogle()).toBeNull();
  });
});

describe("concluirConexaoGoogle (fluxo do callback)", () => {
  it("troca o código, salva o token e carrega as contas da MCC", async () => {
    const provedor = criarProvedorOAuthFalso({ email: "eu@x.com", refreshToken: "rt-novo" });
    const { api } = criarApiGoogleAdsFalsa({
      "900": [{ id: 900, nome: "Agência", gerente: true }, { id: 111, nome: "Loja" }],
    });

    await concluirConexaoGoogle("codigo", { provedor, api });

    const estado = await obterEstadoDaConexao();
    expect(estado).toMatchObject({ conectado: true, email: "eu@x.com" });
    expect(estado.conectado && estado.contas.map((c) => c.customerId).sort()).toEqual(["111", "900"]);
    expect(estado.conectado && estado.contaSelecionada?.customerId).toBe("111");
    expect(await lerRefreshTokenSalvo()).toBe("rt-novo");
  });

  it("se a busca de contas falhar, o token fica salvo e o erro sobe", async () => {
    const provedor = criarProvedorOAuthFalso({ email: "eu@x.com", refreshToken: "rt" });
    const { api } = criarApiGoogleAdsFalsa({ "111": new Error("DEVELOPER_TOKEN_NOT_APPROVED") });
    await expect(concluirConexaoGoogle("codigo", { provedor, api })).rejects.toThrow("DEVELOPER_TOKEN_NOT_APPROVED");
    expect(await lerRefreshTokenSalvo()).toBe("rt");
  });
});

describe("limparCacheDaConta", () => {
  it("só apaga o cache da conta pedida", async () => {
    const expira = new Date(Date.now() + 60_000);
    await prisma.cacheConsulta.createMany({
      data: [
        { chave: "111:a", json: "1", expiraEm: expira },
        { chave: "111:b", json: "2", expiraEm: expira },
        { chave: "1112:a", json: "3", expiraEm: expira },
      ],
    });
    expect(await limparCacheDaConta("111")).toBe(2);
    expect((await prisma.cacheConsulta.findMany()).map((c) => c.chave)).toEqual(["1112:a"]);
  });
});
