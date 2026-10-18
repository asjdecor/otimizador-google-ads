import { NextResponse } from "next/server";
import { barrarOutraOrigem, responderErroExterno } from "@/api/http/respostas";
import { criarApiGoogleAdsDoAmbiente } from "@/api/integracoes/fabrica";
import { atualizarContasDoGoogle } from "@/api/servicos/conexao";

/** Vercel: chamadas ao Google/IA podem levar dezenas de segundos. */
export const maxDuration = 60;

/** Busca de novo a lista de contas no Google (ex.: conta nova adicionada à MCC). */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;

  try {
    await atualizarContasDoGoogle(criarApiGoogleAdsDoAmbiente());
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return responderErroExterno(erro);
  }
}
