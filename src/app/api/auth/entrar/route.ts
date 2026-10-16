import { NextResponse } from "next/server";
import { z } from "zod";
import { barrarOutraOrigem, responderErro } from "@/api/http/respostas";
import { senhaConfere } from "@/api/seguranca/senha";
import { COOKIE_SESSAO, criarTokenDeSessao, DURACAO_DA_SESSAO_MS, lerConfiguracaoDeLogin } from "@/api/seguranca/sessao";

const esquemaCorpo = z.object({ senha: z.string().min(1).max(200) });
const ATRASO_APOS_ERRO_MS = 1000;

/** Confere a senha única do dono e cria a sessão (cookie httpOnly assinado, 7 dias). */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;
  const config = lerConfiguracaoDeLogin();
  if (config.modo !== "ativo") return responderErro("O login não está configurado neste servidor.", 503);

  const corpo = esquemaCorpo.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success || !(await senhaConfere(corpo.data.senha, config.senhaHash))) {
    await new Promise((r) => setTimeout(r, ATRASO_APOS_ERRO_MS)); // freia tentativas em série
    return responderErro("Senha incorreta.", 401);
  }
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_SESSAO, await criarTokenDeSessao(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_DA_SESSAO_MS / 1000,
  });
  return resposta;
}
