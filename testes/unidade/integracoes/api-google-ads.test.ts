import { describe, expect, it, vi } from "vitest";
import type { ConfiguracaoGoogle } from "@/api/configuracao/ambiente";
import { criarApiGoogleAds } from "@/api/integracoes/google-ads/api-google-ads";

const config: ConfiguracaoGoogle = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "http://localhost:3000/api/auth/google/callback",
};

function criarFetchFalso(respostas: Response[]) {
  const requisicoes: { url: string; init?: RequestInit }[] = [];
  const fazerRequisicao: typeof fetch = async (input, init) => {
    requisicoes.push({ url: String(input), init });
    const resposta = respostas.shift();
    if (!resposta) throw new Error("Não há resposta falsa configurada.");
    return resposta;
  };
  return { fazerRequisicao, requisicoes };
}

describe("criarApiGoogleAds", () => {
  it("lista contas acessíveis sem enviar developer-token", async () => {
    const { fazerRequisicao, requisicoes } = criarFetchFalso([
      Response.json({ resourceNames: ["customers/123", "customers/456"] }),
    ]);
    const api = criarApiGoogleAds(config, {
      obterToken: async () => "access-token",
      fazerRequisicao,
    });

    await expect(api.listarIdsAcessiveis("refresh-token")).resolves.toEqual(["123", "456"]);
    const requisicao = requisicoes[0];
    expect(requisicao).toBeDefined();
    expect(requisicao?.url).toContain("/customers:listAccessibleCustomers");
    expect(new Headers(requisicao?.init?.headers).has("developer-token")).toBe(false);
    expect(new Headers(requisicao?.init?.headers).get("authorization")).toBe("Bearer access-token");
  });

  it("consulta GAQL, pagina os resultados e converte chaves REST para snake_case", async () => {
    const { fazerRequisicao, requisicoes } = criarFetchFalso([
      Response.json({
        results: [{ customerClient: { id: "123", descriptiveName: "Loja" } }],
        nextPageToken: "proxima",
      }),
      Response.json({ results: [{ campaign: { id: "9", name: "Campanha" } }] }),
    ]);
    const api = criarApiGoogleAds(config, {
      obterToken: async () => "access-token",
      fazerRequisicao,
    });

    await expect(
      api.consultar(
        { customerId: "123", loginCustomerId: "900", refreshToken: "refresh-token" },
        "SELECT customer_client.id FROM customer_client",
      ),
    ).resolves.toEqual([
      { customer_client: { id: "123", descriptive_name: "Loja" } },
      { campaign: { id: "9", name: "Campanha" } },
    ]);

    expect(requisicoes).toHaveLength(2);
    const primeira = requisicoes[0];
    const segunda = requisicoes[1];
    expect(new Headers(primeira?.init?.headers).get("login-customer-id")).toBe("900");
    expect(new Headers(primeira?.init?.headers).has("developer-token")).toBe(false);
    expect(JSON.parse(String(primeira?.init?.body))).toEqual({
      query: "SELECT customer_client.id FROM customer_client",
    });
    expect(JSON.parse(String(segunda?.init?.body))).toMatchObject({ pageToken: "proxima" });
  });

  it("expõe os detalhes da resposta de erro da Google Ads API", async () => {
    const { fazerRequisicao } = criarFetchFalso([
      Response.json(
        { error: { status: "PERMISSION_DENIED", message: "Access denied" } },
        { status: 403 },
      ),
    ]);
    const api = criarApiGoogleAds(config, {
      obterToken: async () => "access-token",
      fazerRequisicao,
    });

    await expect(api.listarIdsAcessiveis("refresh-token")).rejects.toThrow(
      'Google Ads API (403): {"error":{"status":"PERMISSION_DENIED","message":"Access denied"}}',
    );
  });

  it("usa o token OAuth fornecido para cada chamada", async () => {
    const obterToken = vi.fn(async () => "access-token");
    const { fazerRequisicao } = criarFetchFalso([
      Response.json({ resourceNames: [] }),
      Response.json({ results: [] }),
    ]);
    const api = criarApiGoogleAds(config, { obterToken, fazerRequisicao });

    await api.listarIdsAcessiveis("refresh-token");
    await api.consultar({ customerId: "123", loginCustomerId: null, refreshToken: "refresh-token" }, "SELECT 1");

    expect(obterToken).toHaveBeenCalledTimes(2);
    expect(obterToken).toHaveBeenCalledWith("refresh-token");
  });
});
