import { NextResponse, type NextRequest } from "next/server";
import { ErroParaUsuario } from "@/api/erro-para-usuario";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { criarApiGoogleAdsDoAmbiente, criarProvedorOAuthDoAmbiente } from "@/api/integracoes/fabrica";
import { COOKIE_ESTADO_OAUTH, estadoOAuthConfere } from "@/api/seguranca/requisicao";
import {
  COOKIE_SESSAO,
  criarTokenDeSessaoGoogle,
  DURACAO_DA_SESSAO_MS,
  lerConfiguracaoDeLogin,
} from "@/api/seguranca/sessao";
import { concluirConexaoGoogle, concluirConexaoGoogleComTokens } from "@/api/servicos/conexao";

/** Vercel: chamadas ao Google/IA podem levar dezenas de segundos. */
export const maxDuration = 60;

/** Volta do Google: confere o estado, salva o token e busca as contas. */
export async function GET(requisicao: NextRequest) {
  const parametros = requisicao.nextUrl.searchParams;
  const configLogin = lerConfiguracaoDeLogin();
  const loginGoogle = configLogin.modo === "google";
  const destino = new URL(loginGoogle ? "/login" : "/conectar", requisicao.url);
  let emailAutenticado: string | null = null;
  try {
    if (parametros.get("error")) throw new ErroParaUsuario("Acesso não autorizado no Google. Tente conectar de novo.");
    if (!estadoOAuthConfere(parametros.get("state"), requisicao.cookies.get(COOKIE_ESTADO_OAUTH)?.value)) {
      throw new ErroParaUsuario("A sessão de login expirou ou é inválida. Clique em conectar de novo.");
    }
    const codigo = parametros.get("code");
    if (!codigo) throw new ErroParaUsuario("O Google não devolveu o código de acesso. Tente de novo.");
    const provedor = criarProvedorOAuthDoAmbiente(requisicao.url);
    const api = criarApiGoogleAdsDoAmbiente();
    if (configLogin.modo === "google") {
      const tokens = await provedor.trocarCodigoPorTokens(codigo);
      if (tokens.emailVerificado !== true || tokens.email.trim().toLowerCase() !== configLogin.emailAutorizado) {
        throw new ErroParaUsuario("Esta conta Google não está autorizada para entrar neste app.");
      }
      await concluirConexaoGoogleComTokens(tokens, api);
      emailAutenticado = tokens.email;
    } else {
      await concluirConexaoGoogle(codigo, { provedor, api });
      destino.searchParams.set("ok", "1");
    }
  } catch (erro) {
    destino.searchParams.set("erro", traduzirErroGoogleAds(erro));
  }
  if (emailAutenticado && configLogin.modo === "google") {
    const destinoPainel = new URL("/painel", requisicao.url);
    const resposta = NextResponse.redirect(destinoPainel);
    resposta.cookies.set(COOKIE_SESSAO, await criarTokenDeSessaoGoogle(emailAutenticado, configLogin), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DURACAO_DA_SESSAO_MS / 1000,
    });
    resposta.cookies.delete({ name: COOKIE_ESTADO_OAUTH, path: "/api/auth/google" });
    return resposta;
  }
  const resposta = NextResponse.redirect(destino);
  resposta.cookies.delete({ name: COOKIE_ESTADO_OAUTH, path: "/api/auth/google" });
  return resposta;
}
