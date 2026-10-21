import { claudeEstaConfigurado, lerConfiguracaoClaude, lerConfiguracaoGoogle, listarCamposGoogleFaltando } from "@/api/configuracao/ambiente";
import { modoDemonstracaoAtivo, usarIaReal } from "@/api/configuracao/demonstracao";
import { criarGeradorClaude, type GeradorDeTexto } from "./claude/cliente";
import { ID_MCC_DEMO, RESPOSTAS_DA_IA_DE_DEMONSTRACAO, responderConsultaDeDemonstracao } from "./demonstracao/dados";
import { criarApiGoogleAds, type ApiGoogleAds } from "./google-ads/api-google-ads";
import { criarProvedorOAuthGoogle, type ProvedorOAuth } from "./google-ads/oauth";

export { modoDemonstracaoAtivo };

export function criarApiGoogleAdsDoAmbiente(): ApiGoogleAds {
  if (!modoDemonstracaoAtivo()) return criarApiGoogleAds(lerConfiguracaoGoogle());
  return {
    listarIdsAcessiveis: async () => [ID_MCC_DEMO],
    consultar: async (_credenciais, gaql) => responderConsultaDeDemonstracao(gaql),
  };
}

/** `urlDaRequisicao` serve para o login falso voltar para o próprio app, em qualquer porta. */
export function criarProvedorOAuthDoAmbiente(urlDaRequisicao: string): ProvedorOAuth {
  if (!modoDemonstracaoAtivo()) return criarProvedorOAuthGoogle(lerConfiguracaoGoogle());
  return {
    gerarUrlDeAutorizacao(estado) {
      const volta = new URL("/api/auth/google/callback", urlDaRequisicao);
      volta.searchParams.set("code", "codigo-de-demonstracao");
      volta.searchParams.set("state", estado);
      return volta.toString();
    },
    trocarCodigoPorTokens: async () => ({ email: "demo@loja-demo.example", refreshToken: "token-de-demonstracao" }),
    revogarToken: async () => undefined,
  };
}

export function criarGeradorDoAmbiente(): GeradorDeTexto {
  if (usarIaReal()) return criarGeradorClaude(lerConfiguracaoClaude());
  return {
    async gerarJson(pedido) {
      for (const resposta of RESPOSTAS_DA_IA_DE_DEMONSTRACAO) {
        const lido = pedido.esquema.safeParse(resposta);
        if (lido.success) return { dados: lido.data, modelo: "demonstracao", tokensEntrada: 0, tokensSaida: 0 };
      }
      throw new Error("Sem resposta de demonstração para este pedido.");
    },
  };
}

export function camposGoogleFaltandoNoAmbiente(): string[] {
  return modoDemonstracaoAtivo() ? [] : listarCamposGoogleFaltando();
}

export function iaConfiguradaNoAmbiente(): boolean {
  return usarIaReal() ? claudeEstaConfigurado() : true;
}
