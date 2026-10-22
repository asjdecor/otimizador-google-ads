import { OAuth2Client } from "google-auth-library";
import { googleAdsVersion } from "google-ads-api";
import type { ConfiguracaoGoogle } from "@/api/configuracao/ambiente";

export interface CredenciaisDeConsulta {
  customerId: string;
  /** MCC usada como login-customer-id. Null = acesso direto. */
  loginCustomerId: string | null;
  refreshToken: string;
}

/**
 * Único ponto de contato com a Google Ads API (somente leitura no MVP).
 * Os serviços recebem esta interface, então os testes usam uma versão falsa.
 */
export interface ApiGoogleAds {
  listarIdsAcessiveis(refreshToken: string): Promise<string[]>;
  consultar(credenciais: CredenciaisDeConsulta, gaql: string): Promise<unknown[]>;
}

interface RespostaListaContas {
  resourceNames?: string[];
}

interface RespostaConsulta {
  results?: unknown[];
  nextPageToken?: string;
}

interface DependenciasApiGoogleAds {
  obterToken?: (refreshToken: string) => Promise<string>;
  fazerRequisicao?: typeof fetch;
}

const URL_BASE_GOOGLE_ADS = `https://googleads.googleapis.com/${googleAdsVersion}`;
const DURACAO_CACHE_TOKEN_MS = 50 * 60 * 1000;
const cacheTokens = new Map<string, { token: string; expiraEm: number }>();

function criarObtentorDeToken(config: ConfiguracaoGoogle): (refreshToken: string) => Promise<string> {
  return async (refreshToken) => {
    const salvo = cacheTokens.get(refreshToken);
    if (salvo && salvo.expiraEm > Date.now()) return salvo.token;

    const oauth = new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret });
    oauth.setCredentials({ refresh_token: refreshToken });
    const { token } = await oauth.getAccessToken();
    if (!token) throw new Error("O Google OAuth não devolveu um access token.");

    cacheTokens.set(refreshToken, { token, expiraEm: Date.now() + DURACAO_CACHE_TOKEN_MS });
    return token;
  };
}

function decamelizarChaves(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(decamelizarChaves);
  if (valor === null || typeof valor !== "object") return valor;

  return Object.fromEntries(
    Object.entries(valor).map(([chave, conteudo]) => [
      chave.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`),
      decamelizarChaves(conteudo),
    ]),
  );
}

async function lerErroGoogle(resposta: Response): Promise<Error> {
  const corpo = await resposta.text();
  let detalhe: unknown = corpo;
  try {
    detalhe = JSON.parse(corpo);
  } catch {
    // Preserve the response body when the server does not return JSON.
  }
  return new Error(`Google Ads API (${resposta.status}): ${JSON.stringify(detalhe)}`);
}

export function criarApiGoogleAds(
  config: ConfiguracaoGoogle,
  dependencias: DependenciasApiGoogleAds = {},
): ApiGoogleAds {
  const obterToken = dependencias.obterToken ?? criarObtentorDeToken(config);
  const fazerRequisicao = dependencias.fazerRequisicao ?? fetch;

  return {
    async listarIdsAcessiveis(refreshToken) {
      const resposta = await fazerRequisicao(`${URL_BASE_GOOGLE_ADS}/customers:listAccessibleCustomers`, {
        headers: { Authorization: `Bearer ${await obterToken(refreshToken)}` },
      });
      if (!resposta.ok) throw await lerErroGoogle(resposta);

      const dados = (await resposta.json()) as RespostaListaContas;
      return (dados.resourceNames ?? []).map((nome) => nome.replace("customers/", ""));
    },

    async consultar(credenciais, gaql) {
      const linhas: unknown[] = [];
      let pageToken: string | undefined;

      do {
        const resposta = await fazerRequisicao(
          `${URL_BASE_GOOGLE_ADS}/customers/${encodeURIComponent(credenciais.customerId)}/googleAds:search`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${await obterToken(credenciais.refreshToken)}`,
              "Content-Type": "application/json",
              ...(credenciais.loginCustomerId ? { "login-customer-id": credenciais.loginCustomerId } : {}),
            },
            body: JSON.stringify({ query: gaql, ...(pageToken ? { pageToken } : {}) }),
          },
        );
        if (!resposta.ok) throw await lerErroGoogle(resposta);

        const dados = (await resposta.json()) as RespostaConsulta;
        linhas.push(...(dados.results ?? []).map(decamelizarChaves));
        pageToken = dados.nextPageToken;
      } while (pageToken);

      return linhas;
    },
  };
}
