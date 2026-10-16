import type { ApiGoogleAds, CredenciaisDeConsulta } from "@/api/integracoes/google-ads/api-google-ads";
import type { ProvedorOAuth, TokensDaConexao } from "@/api/integracoes/google-ads/oauth";

export interface LinhaContaFalsa {
  id: number;
  nome: string;
  moeda?: string;
  gerente?: boolean;
}

/**
 * Google Ads falso: `hierarquias` diz o que cada conta raiz enxerga (incluindo ela mesma).
 * Raiz cujo valor é um Error falha ao ser consultada.
 */
export function criarApiGoogleAdsFalsa(hierarquias: Record<string, LinhaContaFalsa[] | Error>) {
  const consultas: CredenciaisDeConsulta[] = [];
  const api: ApiGoogleAds = {
    async listarIdsAcessiveis() {
      return Object.keys(hierarquias);
    },
    async consultar(credenciais) {
      consultas.push(credenciais);
      const resposta = hierarquias[credenciais.customerId];
      if (resposta instanceof Error) throw resposta;
      return (resposta ?? []).map((linha) => ({
        customer_client: {
          id: linha.id,
          descriptive_name: linha.nome,
          currency_code: linha.moeda ?? "BRL",
          manager: linha.gerente ?? false,
        },
      }));
    },
  };
  return { api, consultas };
}

export function criarProvedorOAuthFalso(tokens: TokensDaConexao): ProvedorOAuth & { revogados: string[] } {
  const revogados: string[] = [];
  return {
    revogados,
    gerarUrlDeAutorizacao: (estado) => `https://accounts.google.test/auth?state=${estado}`,
    trocarCodigoPorTokens: async () => tokens,
    revogarToken: async (token) => {
      revogados.push(token);
    },
  };
}
