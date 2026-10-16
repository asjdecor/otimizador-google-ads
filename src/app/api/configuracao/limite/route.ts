import { NextResponse } from "next/server";
import { z } from "zod";
import { barrarOutraOrigem, responderErro } from "@/api/http/respostas";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { salvarLimiteDeDesperdicio } from "@/api/servicos/configuracao";

const esquemaCorpo = z.object({ limiteDesperdicio: z.number() });

/** Salva o valor (R$) a partir do qual uma palavra sem conversão conta como desperdício. */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;

  const corpo = esquemaCorpo.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) return responderErro("Informe um número.");
  try {
    await salvarLimiteDeDesperdicio(corpo.data.limiteDesperdicio);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    return responderErro(traduzirErroGoogleAds(erro));
  }
}
