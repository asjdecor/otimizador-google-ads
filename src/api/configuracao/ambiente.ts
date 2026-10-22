import { ErroParaUsuario } from "@/api/erro-para-usuario";

export interface ConfiguracaoGoogle {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

type Ambiente = Record<string, string | undefined>;

const CAMPOS_GOOGLE_OBRIGATORIOS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"] as const;

export class ErroDeConfiguracao extends ErroParaUsuario {}

/** Lista as variáveis do Google que estão vazias no .env. */
export function listarCamposGoogleFaltando(ambiente: Ambiente = process.env): string[] {
  return CAMPOS_GOOGLE_OBRIGATORIOS.filter((campo) => !ambiente[campo]?.trim());
}

/** Lê a configuração do Google do .env; falha dizendo exatamente o que falta. */
export function lerConfiguracaoGoogle(ambiente: Ambiente = process.env): ConfiguracaoGoogle {
  const faltando = listarCamposGoogleFaltando(ambiente);
  if (faltando.length > 0) {
    throw new ErroDeConfiguracao(`Preencha no arquivo .env: ${faltando.join(", ")}.`);
  }
  return {
    clientId: (ambiente.GOOGLE_CLIENT_ID ?? "").trim(),
    clientSecret: (ambiente.GOOGLE_CLIENT_SECRET ?? "").trim(),
    redirectUri: (ambiente.GOOGLE_REDIRECT_URI ?? "").trim(),
  };
}

/** MCC preferida como login-customer-id (GOOGLE_ADS_LOGIN_CUSTOMER_ID, traços aceitos); null se vazia. */
export function lerMccPreferida(ambiente: Ambiente = process.env): string | null {
  const id = (ambiente.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "").replace(/\D/g, "");
  return id || null;
}

export interface ConfiguracaoClaude {
  apiKey: string;
  modelo: string;
}

export const MODELO_CLAUDE_PADRAO = "claude-opus-5-5";

/** Diz se a chave da Anthropic está preenchida (para a tela avisar antes de tentar gerar). */
export function claudeEstaConfigurado(ambiente: Ambiente = process.env): boolean {
  return Boolean(ambiente.ANTHROPIC_API_KEY?.trim());
}

/** Lê a chave da Anthropic e o modelo do .env (modelo vazio usa o padrão). */
export function lerConfiguracaoClaude(ambiente: Ambiente = process.env): ConfiguracaoClaude {
  const apiKey = ambiente.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new ErroDeConfiguracao("Preencha no arquivo .env: ANTHROPIC_API_KEY (console.anthropic.com → API Keys).");
  }
  return { apiKey, modelo: ambiente.CLAUDE_MODEL?.trim() || MODELO_CLAUDE_PADRAO };
}
