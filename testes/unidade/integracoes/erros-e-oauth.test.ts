import { describe, expect, it } from "vitest";
import { ErroDeConfiguracao } from "@/api/configuracao/ambiente";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { criarProvedorOAuthGoogle, ESCOPOS_GOOGLE, type ClienteOAuthGoogle } from "@/api/integracoes/google-ads/oauth";

const config = { clientId: "cid", clientSecret: "seg", redirectUri: "http://localhost:3000/cb", developerToken: "dev" };

function clienteFalso(tokens: { refresh_token?: string | null; id_token?: string | null }, email?: string) {
  const chamadas: unknown[] = [];
  const cliente: ClienteOAuthGoogle = {
    generateAuthUrl: (opcoes) => {
      chamadas.push(opcoes);
      return "https://accounts.google.com/o/oauth2/v2/auth";
    },
    getToken: async () => ({ tokens }),
    verifyIdToken: async () => ({ getPayload: () => (email ? { email } : {}) }),
    revokeToken: async () => ({}),
  };
  return { cliente, chamadas };
}

describe("traduzirErroGoogleAds", () => {
  it.each([
    [new Error("invalid_grant"), "expirou ou foi revogado"],
    [{ errors: [{ message: "The developer token is only approved for use with test accounts." }] }, "acesso de teste"],
    [new Error("DEVELOPER_TOKEN_INVALID"), "Developer token inválido"],
    [{ errors: [{ message: "User doesn't have permission to access customer." }] }, "não tem permissão"],
    [new Error("CUSTOMER_NOT_ENABLED"), "desativada"],
    [new Error("RESOURCE_EXHAUSTED"), "Limite de consultas"],
    [new Error("redirect_uri_mismatch"), "GOOGLE_REDIRECT_URI"],
  ])("traduz %o", (erro, trecho) => {
    expect(traduzirErroGoogleAds(erro)).toContain(trecho);
  });

  it("repassa a mensagem de erros já preparados para o usuário", () => {
    expect(traduzirErroGoogleAds(new ErroDeConfiguracao("Preencha X"))).toBe("Preencha X");
  });

  it("tem mensagem padrão e nunca expõe o erro técnico", () => {
    const mensagem = traduzirErroGoogleAds(new Error("ECONNRESET at socket.js:12"));
    expect(mensagem).toBe("Não foi possível falar com o Google Ads. Tente de novo em instantes.");
  });
});

describe("criarProvedorOAuthGoogle", () => {
  it("pede acesso offline, força consentimento e envia o estado", () => {
    const { cliente, chamadas } = clienteFalso({});
    criarProvedorOAuthGoogle(config, cliente).gerarUrlDeAutorizacao("abc");
    expect(chamadas[0]).toMatchObject({ access_type: "offline", prompt: "consent", state: "abc", scope: ESCOPOS_GOOGLE });
  });

  it("o escopo é o do Google Ads + e-mail", () => {
    expect(ESCOPOS_GOOGLE).toContain("https://www.googleapis.com/auth/adwords");
    expect(ESCOPOS_GOOGLE).toContain("email");
  });

  it("devolve refresh token e e-mail", async () => {
    const { cliente } = clienteFalso({ refresh_token: "rt", id_token: "idt" }, "eu@exemplo.com");
    expect(await criarProvedorOAuthGoogle(config, cliente).trocarCodigoPorTokens("cod")).toEqual({
      refreshToken: "rt",
      email: "eu@exemplo.com",
    });
  });

  it("falha com instrução quando o Google não manda refresh token", async () => {
    const { cliente } = clienteFalso({ refresh_token: null, id_token: "idt" }, "eu@exemplo.com");
    await expect(criarProvedorOAuthGoogle(config, cliente).trocarCodigoPorTokens("cod")).rejects.toThrow(
      "myaccount.google.com/permissions",
    );
  });

  it("falha quando não há e-mail no id token", async () => {
    const { cliente } = clienteFalso({ refresh_token: "rt", id_token: "idt" });
    await expect(criarProvedorOAuthGoogle(config, cliente).trocarCodigoPorTokens("cod")).rejects.toThrow("e-mail");
  });
});
