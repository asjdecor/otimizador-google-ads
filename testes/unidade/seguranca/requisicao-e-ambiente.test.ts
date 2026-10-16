import { describe, expect, it } from "vitest";
import { lerConfiguracaoGoogle, listarCamposGoogleFaltando } from "@/api/configuracao/ambiente";
import { estadoOAuthConfere, gerarEstadoOAuth, requisicaoEhDaMesmaOrigem } from "@/api/seguranca/requisicao";
import { formatarIdDaConta } from "@/api/servicos/formatacao";

describe("estado OAuth", () => {
  it("gera valores aleatórios e longos", () => {
    const a = gerarEstadoOAuth();
    expect(a).not.toBe(gerarEstadoOAuth());
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("só confere quando é idêntico e presente", () => {
    expect(estadoOAuthConfere("abc", "abc")).toBe(true);
    expect(estadoOAuthConfere("abc", "abd")).toBe(false);
    expect(estadoOAuthConfere("abc", "abcd")).toBe(false);
    expect(estadoOAuthConfere(null, "abc")).toBe(false);
    expect(estadoOAuthConfere("abc", undefined)).toBe(false);
    expect(estadoOAuthConfere("", "")).toBe(false);
  });
});

describe("requisicaoEhDaMesmaOrigem", () => {
  const cabecalhos = (valores: Record<string, string>) => new Headers(valores);

  it("aceita origem igual ao host", () => {
    expect(requisicaoEhDaMesmaOrigem(cabecalhos({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });

  it("recusa outro site, origem ausente ou inválida", () => {
    expect(requisicaoEhDaMesmaOrigem(cabecalhos({ origin: "https://site-mal.com", host: "localhost:3000" }))).toBe(false);
    expect(requisicaoEhDaMesmaOrigem(cabecalhos({ host: "localhost:3000" }))).toBe(false);
    expect(requisicaoEhDaMesmaOrigem(cabecalhos({ origin: "null", host: "localhost:3000" }))).toBe(false);
  });
});

describe("configuração do Google", () => {
  const completo = {
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "seg",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/cb",
    GOOGLE_ADS_DEVELOPER_TOKEN: "dev",
  };

  it("lista os campos vazios (espaços contam como vazio)", () => {
    expect(listarCamposGoogleFaltando({ ...completo, GOOGLE_CLIENT_ID: " ", GOOGLE_ADS_DEVELOPER_TOKEN: undefined })).toEqual([
      "GOOGLE_CLIENT_ID",
      "GOOGLE_ADS_DEVELOPER_TOKEN",
    ]);
    expect(listarCamposGoogleFaltando(completo)).toEqual([]);
  });

  it("lerConfiguracaoGoogle diz o que falta", () => {
    expect(() => lerConfiguracaoGoogle({ ...completo, GOOGLE_CLIENT_SECRET: "" })).toThrow("GOOGLE_CLIENT_SECRET");
    expect(lerConfiguracaoGoogle(completo).developerToken).toBe("dev");
  });
});

describe("formatarIdDaConta", () => {
  it("formata 10 dígitos e deixa o resto como está", () => {
    expect(formatarIdDaConta("1234567890")).toBe("123-456-7890");
    expect(formatarIdDaConta("123")).toBe("123");
  });
});
