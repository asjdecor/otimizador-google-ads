import { NextResponse } from "next/server";
import { lerConfiguracaoGoogle } from "@/api/configuracao/ambiente";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { criarProvedorOAuthGoogle } from "@/api/integracoes/google-ads/oauth";
import { COOKIE_ESTADO_OAUTH, gerarEstadoOAuth } from "@/api/seguranca/requisicao";

/** Início do login: manda o usuário para o Google com um "estado" guardado em cookie. */
export function GET(requisicao: Request) {
  try {
    const provedor = criarProvedorOAuthGoogle(lerConfiguracaoGoogle());
    const estado = gerarEstadoOAuth();
    const resposta = NextResponse.redirect(provedor.gerarUrlDeAutorizacao(estado));
    resposta.cookies.set(COOKIE_ESTADO_OAUTH, estado, {
      httpOnly: true,
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 600,
    });
    return resposta;
  } catch (erro) {
    const destino = new URL("/conectar", requisicao.url);
    destino.searchParams.set("erro", traduzirErroGoogleAds(erro));
    return NextResponse.redirect(destino);
  }
}
