import { NextResponse } from "next/server";
import { barrarOutraOrigem, responderErro } from "@/api/http/respostas";
import { limparCacheDaConta } from "@/api/servicos/cache";
import { obterEstadoDaConexao } from "@/api/servicos/conexao";

/** Botão "Atualizar": descarta o cache da conta selecionada para a próxima leitura vir do Google. */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;

  const estado = await obterEstadoDaConexao();
  if (!estado.conectado || !estado.contaSelecionada) return responderErro("Nenhuma conta selecionada.");
  const removidos = await limparCacheDaConta(estado.contaSelecionada.customerId);
  return NextResponse.json({ ok: true, removidos });
}
