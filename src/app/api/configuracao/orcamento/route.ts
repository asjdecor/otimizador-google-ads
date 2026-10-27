import { NextResponse } from "next/server";
import { z } from "zod";
import { barrarOutraOrigem, responderErro } from "@/api/http/respostas";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { salvarOrcamentoMaximoPorCampanha, salvarOrcamentoMaximoTotal } from "@/api/servicos/configuracao";

const esquemaCorpo = z.object({
  orcamentoMaximoPorCampanha: z.number().nullable().optional(),
  orcamentoMaximoTotal: z.number().nullable().optional(),
});

/** Salva os tetos diários de orçamento para campanhas criadas pelo app. */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;

  const corpo = esquemaCorpo.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) return responderErro("Informe valores numéricos para os tetos de orçamento.");

  try {
    if ("orcamentoMaximoPorCampanha" in corpo.data) {
      await salvarOrcamentoMaximoPorCampanha(corpo.data.orcamentoMaximoPorCampanha ?? null);
    }
    if ("orcamentoMaximoTotal" in corpo.data) {
      await salvarOrcamentoMaximoTotal(corpo.data.orcamentoMaximoTotal ?? null);
    }
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return responderErro(traduzirErroGoogleAds(erro));
  }
}
