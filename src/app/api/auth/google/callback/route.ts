import { NextResponse, type NextRequest } from "next/server";
import { ErroParaUsuario } from "@/api/erro-para-usuario";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { criarApiGoogleAdsDoAmbiente, criarProvedorOAuthDoAmbiente } from "@/api/integracoes/fabrica";
import { COOKIE_ESTADO_OAUTH, estadoOAuthConfere } from "@/api/seguranca/requisicao";
import { concluirConexaoGoogle } from "@/api/servicos/conexao";

/** Vercel: chamadas ao Google/IA podem levar dezenas de segundos. */
export const maxDuration = 60;

/** Volta do Google: confere o estado, salva o token e busca as contas. */
export async function GET(requisicao: NextRequest) {
  const parametros = requisicao.nextUrl.searchParams;
  const destino = new URL("/conectar", requisicao.url);
  try {
    if (parametros.get("error")) throw new ErroParaUsuario("Acesso não autorizado no Google. Tente conectar de novo.");
    if (!estadoOAuthConfere(parametros.get("state"), requisicao.cookies.get(COOKIE_ESTADO_OAUTH)?.value)) {
      throw new ErroParaUsuario("A sessão de login expirou ou é inválida. Clique em conectar de novo.");
    }
    const codigo = parametros.get("code");
    if (!codigo) throw new ErroParaUsuario("O Google não devolveu o código de acesso. Tente de novo.");
    await concluirConexaoGoogle(codigo, {
      provedor: criarProvedorOAuthDoAmbiente(requisicao.url),
      api: criarApiGoogleAdsDoAmbiente(),
    });
    destino.searchParams.set("ok", "1");
  } catch (erro) {
    destino.searchParams.set("erro", traduzirErroGoogleAds(erro));
  }
  const resposta = NextResponse.redirect(destino);
  resposta.cookies.delete({ name: COOKIE_ESTADO_OAUTH, path: "/api/auth/google" });
  return resposta;
}
