import { ErroParaUsuario } from "@/api/erro-para-usuario";

export interface ConfiguracaoGoogle {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Opcional: o Google descontinuou o developer token em 09/09/2026 (o acesso agora é do projeto do Google Cloud). */
  developerToken: string;
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
    developerToken: (ambiente.GOOGLE_ADS_DEVELOPER_TOKEN ?? "").trim(),
  };
}

export interface ConfiguracaoClaude {
  apiKey: string;
  modelo: string;
}

export const MODELO_CLAUDE_PADRAO = "claude-opus-5-5";
export interface ConfiguracaoOpenAI {
  apiKey: string;
  modelo: string;
}

export const MODELO_OPENAI_PADRAO = "gpt-4.1-mini";

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

export function openaiEstaConfigurado(ambiente: Ambiente = process.env): boolean {
  return Boolean(ambiente.OPENAI_API_KEY?.trim());
}

export function lerConfiguracaoOpenAI(ambiente: Ambiente = process.env): ConfiguracaoOpenAI {
  const apiKey = ambiente.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ErroDeConfiguracao("Preencha OPENAI_API_KEY no .env (platform.openai.com → API keys).");
  }
  return { apiKey, modelo: ambiente.OPENAI_MODEL?.trim() || MODELO_OPENAI_PADRAO };
}
