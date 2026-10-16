import { ErroParaUsuario } from "@/api/erro-para-usuario";

const REGRAS_DE_TRADUCAO: { padroes: RegExp; mensagem: string }[] = [
  {
    padroes: /invalid_grant|token has been expired or revoked/i,
    mensagem: "O acesso ao Google expirou ou foi revogado. Desconecte e conecte a conta de novo.",
  },
  {
    padroes: /DEVELOPER_TOKEN_NOT_APPROVED|only approved for use with test accounts/i,
    mensagem:
      "Seu developer token só tem acesso de teste e só lê contas de teste. Peça o acesso Básico na Central de API da sua MCC.",
  },
  {
    padroes: /DEVELOPER_TOKEN_(INVALID|PROHIBITED|PARAMETER_MISSING)|developer token is not valid/i,
    mensagem: "Developer token inválido. Confira GOOGLE_ADS_DEVELOPER_TOKEN no arquivo .env.",
  },
  {
    padroes: /USER_PERMISSION_DENIED|doesn't have permission to access customer/i,
    mensagem: "Sua conta Google não tem permissão nessa conta de anúncios (ou falta passar pela MCC certa).",
  },
  {
    padroes: /CUSTOMER_NOT_ENABLED|customer (account )?(is )?not (yet )?enabled/i,
    mensagem: "Essa conta de anúncios está desativada ou cancelada.",
  },
  {
    padroes: /RESOURCE_EXHAUSTED|RESOURCE_TEMPORARILY_EXHAUSTED|quota/i,
    mensagem: "Limite de consultas da API do Google atingido. Espere alguns minutos e tente de novo.",
  },
  {
    padroes: /redirect_uri_mismatch/i,
    mensagem: "O endereço de retorno não bate com o cadastrado no Google Cloud. Confira GOOGLE_REDIRECT_URI.",
  },
];

function extrairTextoDoErro(erro: unknown): string {
  if (erro instanceof Error) {
    return `${erro.message} ${JSON.stringify(erro)}`;
  }
  try {
    return JSON.stringify(erro) ?? String(erro);
  } catch {
    return String(erro);
  }
}

/** Converte erros do Google/OAuth em uma frase que diz ao usuário o que fazer. */
export function traduzirErroGoogleAds(erro: unknown): string {
  if (erro instanceof ErroParaUsuario) return erro.message;
  const texto = extrairTextoDoErro(erro);
  const regra = REGRAS_DE_TRADUCAO.find(({ padroes }) => padroes.test(texto));
  return regra?.mensagem ?? "Não foi possível falar com o Google Ads. Tente de novo em instantes.";
}
