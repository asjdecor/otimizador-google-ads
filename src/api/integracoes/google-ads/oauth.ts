import { OAuth2Client } from "google-auth-library";
import type { ConfiguracaoGoogle } from "@/api/configuracao/ambiente";
import { ErroParaUsuario } from "@/api/erro-para-usuario";

export const ESCOPOS_GOOGLE = ["https://www.googleapis.com/auth/adwords", "openid", "email"];

export interface TokensDaConexao {
  refreshToken: string;
  email: string;
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
  getToken(codigo: string): Promise<{ tokens: { refresh_token?: string | null; id_token?: string | null } }>;
  verifyIdToken(opcoes: { idToken: string; audience: string }): Promise<{ getPayload(): { email?: string } | undefined }>;
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
      if (!tokens.refresh_token) {
        throw new ErroParaUsuario(
          "O Google não devolveu o token de acesso permanente. Remova o app em myaccount.google.com/permissions e conecte de novo.",
        );
      }
      if (!tokens.id_token) {
        throw new ErroParaUsuario("O Google não devolveu a identificação da conta. Tente conectar de novo.");
      }
      const ticket = await cliente.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
      const email = ticket.getPayload()?.email;
      if (!email) {
        throw new ErroParaUsuario("Não foi possível ler o e-mail da conta Google. Tente conectar de novo.");
      }
      return { refreshToken: tokens.refresh_token, email };
    },

    async revogarToken(refreshToken) {
      await cliente.revokeToken(refreshToken);
    },
  };
}
