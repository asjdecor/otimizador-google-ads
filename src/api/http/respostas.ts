import { NextResponse } from "next/server";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { requisicaoEhDaMesmaOrigem } from "@/api/seguranca/requisicao";

export function responderErro(mensagem: string, status = 400): NextResponse {
  return NextResponse.json({ erro: mensagem }, { status });
}

/** Erro inesperado: frase útil para o usuário; detalhe só no log do servidor (sem tokens). */
export function responderErroDoGoogle(erro: unknown): NextResponse {
  console.error("[google-ads]", erro instanceof Error ? erro.message : erro);
  return responderErro(traduzirErroGoogleAds(erro), 502);
}

/** Barra POSTs vindos de outros sites. Retorna a resposta de erro, ou null se estiver tudo certo. */
export function barrarOutraOrigem(requisicao: Request): NextResponse | null {
  return requisicaoEhDaMesmaOrigem(requisicao.headers) ? null : responderErro("Origem não permitida.", 403);
}
