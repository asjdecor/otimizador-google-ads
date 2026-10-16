import { NextResponse } from "next/server";
import { lerConfiguracaoGoogle } from "@/api/configuracao/ambiente";
import { barrarOutraOrigem } from "@/api/http/respostas";
import { criarProvedorOAuthGoogle } from "@/api/integracoes/google-ads/oauth";
import { desconectarGoogle } from "@/api/servicos/conexao";

/** Apaga token, contas e cache; tenta também revogar o acesso no Google (sem travar se falhar). */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;

  const refreshToken = await desconectarGoogle();
  if (refreshToken) {
    try {
      await criarProvedorOAuthGoogle(lerConfiguracaoGoogle()).revogarToken(refreshToken);
    } catch {
      // O token já foi apagado daqui; revogar no Google é só um cuidado extra.
    }
  }
  return NextResponse.json({ ok: true });
}
