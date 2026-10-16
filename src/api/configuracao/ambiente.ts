import { ErroParaUsuario } from "@/api/erro-para-usuario";

export interface ConfiguracaoGoogle {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  developerToken: string;
}

type Ambiente = Record<string, string | undefined>;

const CAMPOS_GOOGLE_OBRIGATORIOS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
] as const;

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
