import { NextResponse } from "next/server";
import { barrarOutraOrigem } from "@/api/http/respostas";
import { COOKIE_SESSAO } from "@/api/seguranca/sessao";

/** Encerra a sessão do app (não mexe na conexão com o Google). */
export function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.delete({ name: COOKIE_SESSAO, path: "/" });
  return resposta;
}
