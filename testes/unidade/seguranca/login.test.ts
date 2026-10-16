import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { gerarHashDeSenha, senhaConfere } from "@/api/seguranca/senha";
import {
  caminhoDeVoltaSeguro,
  criarTokenDeSessao,
  decidirAcesso,
  DURACAO_DA_SESSAO_MS,
  lerConfiguracaoDeLogin,
  tokenDeSessaoEhValido,
  type ConfiguracaoDeLogin,
} from "@/api/seguranca/sessao";

const segredo = "s".repeat(40);
const config = { senhaHash: "scrypt:abc:def", segredo };
const ativo: ConfiguracaoDeLogin = { modo: "ativo", ...config };
const agora = Date.UTC(2026, 9, 15, 12);

describe("lerConfiguracaoDeLogin", () => {
  it("no PC sem senha: login desligado", () => {
    expect(lerConfiguracaoDeLogin({ NODE_ENV: "development" })).toEqual({ modo: "desligado" });
  });

  it("em produção ou na Vercel sem senha: bloqueia (falha fechada)", () => {
    expect(lerConfiguracaoDeLogin({ NODE_ENV: "production" }).modo).toBe("mal-configurado");
    expect(lerConfiguracaoDeLogin({ VERCEL: "1", NODE_ENV: "development" }).modo).toBe("mal-configurado");
  });

  it("com senha mas segredo curto: bloqueia", () => {
    expect(lerConfiguracaoDeLogin({ APP_SENHA_HASH: "x", APP_SESSAO_SEGREDO: "curto" })).toMatchObject({
      modo: "mal-configurado",
      motivo: expect.stringContaining("APP_SESSAO_SEGREDO"),
    });
  });

  it("com senha e segredo: ativo", () => {
    expect(lerConfiguracaoDeLogin({ APP_SENHA_HASH: "x", APP_SESSAO_SEGREDO: segredo }).modo).toBe("ativo");
  });
});

describe("token de sessão", () => {
  it("token recém-criado é válido até expirar", async () => {
    const token = await criarTokenDeSessao(config, agora);
    expect(await tokenDeSessaoEhValido(token, config, agora + 1000)).toBe(true);
    expect(await tokenDeSessaoEhValido(token, config, agora + DURACAO_DA_SESSAO_MS + 1)).toBe(false);
  });

  it("recusa token adulterado (validade estendida à mão)", async () => {
    const [v, expira, assinatura] = (await criarTokenDeSessao(config, agora)).split(".");
    const adulterado = `${v}.${Number(expira) + DURACAO_DA_SESSAO_MS}.${assinatura}`;
    expect(await tokenDeSessaoEhValido(adulterado, config, agora)).toBe(false);
  });

  it("trocar o segredo ou a senha invalida as sessões antigas", async () => {
    const token = await criarTokenDeSessao(config, agora);
    expect(await tokenDeSessaoEhValido(token, { ...config, segredo: "t".repeat(40) }, agora)).toBe(false);
    expect(await tokenDeSessaoEhValido(token, { ...config, senhaHash: "scrypt:outra:senha" }, agora)).toBe(false);
  });

  it.each([undefined, "", "lixo", "v1.123", "v2.9999999999999.abc", "v1.abc.def", "v1.9999999999999.!!!"])(
    "recusa %o",
    async (token) => {
      expect(await tokenDeSessaoEhValido(token, config, agora)).toBe(false);
    },
  );
});

describe("decidirAcesso (middleware)", () => {
  it("login desligado libera tudo; mal configurado bloqueia tudo", async () => {
    expect(await decidirAcesso("/", undefined, { modo: "desligado" })).toBe("liberar");
    expect(await decidirAcesso("/login", undefined, { modo: "mal-configurado", motivo: "x" })).toBe("bloquear-configuracao");
  });

  it("sem sessão: tela vai para o login, API recebe 401, login é público", async () => {
    expect(await decidirAcesso("/anuncios", undefined, ativo, agora)).toBe("redirecionar-login");
    expect(await decidirAcesso("/api/sugestoes", undefined, ativo, agora)).toBe("negar-api");
    expect(await decidirAcesso("/api/auth/google/callback", undefined, ativo, agora)).toBe("negar-api");
    expect(await decidirAcesso("/login", undefined, ativo, agora)).toBe("liberar");
    expect(await decidirAcesso("/api/auth/entrar", undefined, ativo, agora)).toBe("liberar");
  });

  it("com sessão válida libera telas e API", async () => {
    const token = await criarTokenDeSessao(config, agora);
    expect(await decidirAcesso("/anuncios/10~1", token, ativo, agora)).toBe("liberar");
    expect(await decidirAcesso("/api/sugestoes", token, ativo, agora)).toBe("liberar");
  });

  it("não confunde caminho parecido com público", async () => {
    expect(await decidirAcesso("/login-falso", undefined, ativo, agora)).toBe("redirecionar-login");
    expect(await decidirAcesso("/api/auth/entrar/x", undefined, ativo, agora)).toBe("negar-api");
  });
});

describe("caminhoDeVoltaSeguro", () => {
  it.each([
    ["/anuncios?x=1", "/anuncios?x=1"],
    [null, "/"],
    ["https://site-mal.com", "/"],
    ["//site-mal.com", "/"],
    ["/\\site-mal.com", "/"],
    ["anuncios", "/"],
  ])("%o → %o", (entrada, esperado) => {
    expect(caminhoDeVoltaSeguro(entrada)).toBe(esperado);
  });
});

describe("senha", () => {
  it("confere a senha certa e recusa a errada", async () => {
    const hash = await gerarHashDeSenha("minha senha forte 123");
    expect(hash).toMatch(/^scrypt:[^:$]+:[^:$]+$/);
    expect(await senhaConfere("minha senha forte 123", hash)).toBe(true);
    expect(await senhaConfere("minha senha forte 124", hash)).toBe(false);
  });

  it("hash em formato inválido nunca confere", async () => {
    expect(await senhaConfere("x", "")).toBe(false);
    expect(await senhaConfere("x", "bcrypt:a:b")).toBe(false);
    expect(await senhaConfere("x", "scrypt:YQ==:YQ==")).toBe(false);
  });

  it("o script gerar-senha produz um hash que o app aceita", async () => {
    const saida = execFileSync("node", ["scripts/gerar-senha.mjs", "senha do script 123"], { encoding: "utf8" });
    const hash = /APP_SENHA_HASH="([^"]+)"/.exec(saida)?.[1] ?? "";
    const segredoGerado = /APP_SESSAO_SEGREDO="([^"]+)"/.exec(saida)?.[1] ?? "";
    expect(await senhaConfere("senha do script 123", hash)).toBe(true);
    expect(segredoGerado.length).toBeGreaterThanOrEqual(32);
  });

  it("o script recusa senha curta", () => {
    expect(() => execFileSync("node", ["scripts/gerar-senha.mjs", "curta"], { stdio: "pipe" })).toThrow();
  });
});
