import { NextResponse } from "next/server";
import { barrarOutraOrigem } from "@/api/http/respostas";
import { criarProvedorOAuthDoAmbiente } from "@/api/integracoes/fabrica";
import { desconectarGoogle } from "@/api/servicos/conexao";

/** Apaga token, contas e cache; tenta também revogar o acesso no Google (sem travar se falhar). */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;

  const refreshToken = await desconectarGoogle();
  if (refreshToken) {
    try {
      await criarProvedorOAuthDoAmbiente(requisicao.url).revogarToken(refreshToken);
    } catch {
      // O token já foi apagado daqui; revogar no Google é só um cuidado extra.
    }
  }
  return NextResponse.json({ ok: true });
}
