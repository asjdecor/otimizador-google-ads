import { enums, GoogleAdsApi, services } from "google-ads-api";
import type { ConfiguracaoGoogle } from "@/api/configuracao/ambiente";
import type { PedidoDeIdeias } from "./planejador";

export interface CredenciaisDeConsulta {
  customerId: string;
  /** MCC usada como login-customer-id. Null = acesso direto. */
  loginCustomerId: string | null;
  refreshToken: string;
}

/**
 * Único ponto de contato com a Google Ads API (leitura; o Planejador também é só leitura).
 * Os serviços recebem esta interface, então os testes usam uma versão falsa.
 */
export interface ApiGoogleAds {
  listarIdsAcessiveis(refreshToken: string): Promise<string[]>;
  consultar(credenciais: CredenciaisDeConsulta, gaql: string): Promise<unknown[]>;
  /** Ideias do Planejador de Palavras-chave; a resposta crua é tratada por `mapearIdeiasDePalavras`. */
  gerarIdeiasDePalavras(credenciais: CredenciaisDeConsulta, pedido: PedidoDeIdeias): Promise<unknown>;
}

export function criarApiGoogleAds(config: ConfiguracaoGoogle): ApiGoogleAds {
  const cliente = new GoogleAdsApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    developer_token: config.developerToken,
  });

  const abrirConta = (credenciais: CredenciaisDeConsulta) =>
    cliente.Customer({
      customer_id: credenciais.customerId,
      refresh_token: credenciais.refreshToken,
      ...(credenciais.loginCustomerId ? { login_customer_id: credenciais.loginCustomerId } : {}),
    });

  return {
    async listarIdsAcessiveis(refreshToken) {
      const resposta = await cliente.listAccessibleCustomers(refreshToken);
      return (resposta.resource_names ?? []).map((nome) => nome.replace("customers/", ""));
    },

    async consultar(credenciais, gaql) {
      const linhas: unknown[] = await abrirConta(credenciais).query(gaql);
      return linhas;
    },

    async gerarIdeiasDePalavras(credenciais, pedido) {
      const { urlSemente, palavrasSemente } = pedido;
      const semente =
        urlSemente && palavrasSemente.length > 0
          ? {
              keyword_and_url_seed: {
                url: urlSemente,
                keywords: palavrasSemente,
              },
            }
          : urlSemente
            ? { url_seed: { url: urlSemente } }
            : { keyword_seed: { keywords: palavrasSemente } };
      return abrirConta(credenciais).keywordPlanIdeas.generateKeywordIdeas(
        new services.GenerateKeywordIdeasRequest({
          customer_id: credenciais.customerId,
          language: `languageConstants/${pedido.idioma}`,
          geo_target_constants: pedido.idsGeo.map((id) => `geoTargetConstants/${id}`),
          keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
          include_adult_keywords: false,
          ...semente,
        }),
      );
    },
  };
}
