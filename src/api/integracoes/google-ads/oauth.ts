import { OAuth2Client } from "google-auth-library";
import type { ConfiguracaoGoogle } from "@/api/configuracao/ambiente";
import { ErroParaUsuario } from "@/api/erro-para-usuario";

const ESCOPO_GOOGLE_ADS = "https://www.googleapis.com/auth/adwords";

export const ESCOPOS_GOOGLE = [ESCOPO_GOOGLE_ADS, "openid", "email"];

export interface TokensDaConexao {
  refreshToken: string;
  email: string;
  emailVerificado?: boolean;
}

/** O que o app precisa do OAuth do Google (permite usar um falso nos testes). */
export interface ProvedorOAuth {
  gerarUrlDeAutorizacao(estado: string): string;
  trocarCodigoPorTokens(codigo: string): Promise<TokensDaConexao>;
  revogarToken(refreshToken: string): Promise<void>;
}

/** Parte do OAuth2Client que usamos — o cliente real satisfaz esta interface. */
export interface ClienteOAuthGoogle {
  generateAuthUrl(opcoes: {
    access_type: string;
    prompt: string;
    scope: string[];
    state: string;
    include_granted_scopes: boolean;
  }): string;
  getToken(
    codigo: string,
  ): Promise<{ tokens: { refresh_token?: string | null; id_token?: string | null; scope?: string | null } }>;
  verifyIdToken(opcoes: { idToken: string; audience: string }): Promise<{ getPayload(): { email?: string; email_verified?: boolean } | undefined }>;
  revokeToken(token: string): Promise<unknown>;
}

export function criarProvedorOAuthGoogle(
  config: ConfiguracaoGoogle,
  cliente: ClienteOAuthGoogle = new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
  }),
): ProvedorOAuth {
  return {
    gerarUrlDeAutorizacao(estado) {
      return cliente.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ESCOPOS_GOOGLE,
        state: estado,
        include_granted_scopes: true,
      });
    },

    async trocarCodigoPorTokens(codigo) {
      const { tokens } = await cliente.getToken(codigo);
      // Na tela do Google cada permissão tem uma caixa; sem a do Ads o login funciona, mas nenhuma consulta funciona.
      if (tokens.scope && !tokens.scope.split(" ").includes(ESCOPO_GOOGLE_ADS)) {
        throw new ErroParaUsuario(
          "A permissão do Google Ads não foi concedida. Conecte de novo e marque a caixa do Google Ads na tela do Google.",
        );
      }
      if (!tokens.refresh_token) {
        throw new ErroParaUsuario(
          "O Google não devolveu o token de acesso permanente. Remova o app em myaccount.google.com/permissions e conecte de novo.",
        );
      }
      if (!tokens.id_token) {
        throw new ErroParaUsuario("O Google não devolveu a identificação da conta. Tente conectar de novo.");
      }
      const ticket = await cliente.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
      const payload = ticket.getPayload();
      const email = payload?.email;
      const emailVerificado = payload?.email_verified;
      if (!email) {
        throw new ErroParaUsuario("Não foi possível ler o e-mail da conta Google. Tente conectar de novo.");
      }
      return { refreshToken: tokens.refresh_token, email, emailVerificado };
    },

    async revogarToken(refreshToken) {
      await cliente.revokeToken(refreshToken);
    },
  };
}
