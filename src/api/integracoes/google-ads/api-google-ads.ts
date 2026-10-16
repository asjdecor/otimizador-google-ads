import { GoogleAdsApi } from "google-ads-api";
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

export function criarApiGoogleAds(config: ConfiguracaoGoogle): ApiGoogleAds {
  const cliente = new GoogleAdsApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    developer_token: config.developerToken,
  });

  return {
    async listarIdsAcessiveis(refreshToken) {
      const resposta = await cliente.listAccessibleCustomers(refreshToken);
      return (resposta.resource_names ?? []).map((nome) => nome.replace("customers/", ""));
    },

    async consultar(credenciais, gaql) {
      const conta = cliente.Customer({
        customer_id: credenciais.customerId,
        refresh_token: credenciais.refreshToken,
        ...(credenciais.loginCustomerId ? { login_customer_id: credenciais.loginCustomerId } : {}),
      });
      const linhas: unknown[] = await conta.query(gaql);
      return linhas;
    },
  };
}
