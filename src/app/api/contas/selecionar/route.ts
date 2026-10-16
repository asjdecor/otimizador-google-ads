import { NextResponse } from "next/server";
import { z } from "zod";
import { barrarOutraOrigem, responderErro } from "@/api/http/respostas";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { selecionarContaAds } from "@/api/servicos/conexao";

const esquemaCorpo = z.object({ customerId: z.string().regex(/^\d+$/, "ID de conta inválido") });

export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;

  const corpo = esquemaCorpo.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) return responderErro("Escolha uma conta válida.");
  try {
    await selecionarContaAds(corpo.data.customerId);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return responderErro(traduzirErroGoogleAds(erro));
  }
}
