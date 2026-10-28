import { ErroParaUsuario } from "@/api/erro-para-usuario";

const REGRAS_DE_TRADUCAO: { padroes: RegExp; mensagem: string }[] = [
  {
    padroes: /invalid_grant|token has been expired or revoked/i,
    mensagem: "O acesso ao Google expirou ou foi revogado. Desconecte e conecte a conta de novo.",
  },
  {
    padroes: /CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION/i,
    mensagem:
      "O projeto Google Cloud ainda não tem acesso a contas reais. Confira o nível de acesso da Google Ads API no projeto e solicite acesso Explorer ou superior.",
  },
  {
    padroes: /DEVELOPER_TOKEN_NOT_APPROVED|only approved for use with test accounts/i,
    mensagem:
      "O projeto do Google Cloud só tem acesso de teste à Google Ads API. Confira se o nível de acesso do projeto é Básico.",
  },
  {
    padroes: /DEVELOPER_TOKEN_(INVALID|PROHIBITED|PARAMETER_MISSING)|developer token is not valid/i,
    mensagem:
      "O Google recusou o acesso do projeto à Google Ads API. Confira se GOOGLE_CLIENT_ID é do projeto com acesso aprovado.",
  },
  {
    padroes: /ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient authentication scopes/i,
    mensagem:
      "A permissão do Google Ads não foi concedida. Desconecte, conecte de novo e marque a caixa do Google Ads na tela do Google.",
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
