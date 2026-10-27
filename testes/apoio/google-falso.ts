import type { ApiGoogleAds, CredenciaisDeConsulta } from "@/api/integracoes/google-ads/api-google-ads";
import type { PedidoDeIdeias } from "@/api/integracoes/google-ads/planejador";
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
 * `ideias` é a resposta do Planejador de Palavras-chave (um Error faz o método falhar).
 */
export function criarApiGoogleAdsFalsa(
  hierarquias: Record<string, LinhaContaFalsa[] | Error>,
  opcoes: { ideias?: unknown } = {},
) {
  const consultas: CredenciaisDeConsulta[] = [];
  const pedidosDeIdeias: { credenciais: CredenciaisDeConsulta; pedido: PedidoDeIdeias }[] = [];
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
    async gerarIdeiasDePalavras(credenciais, pedido) {
      pedidosDeIdeias.push({ credenciais, pedido });
      if (opcoes.ideias instanceof Error) throw opcoes.ideias;
      return opcoes.ideias ?? { results: [] };
    },
  };
  return { api, consultas, pedidosDeIdeias };
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
