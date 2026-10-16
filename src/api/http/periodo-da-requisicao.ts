import { cookies } from "next/headers";
import { COOKIE_PERIODO, lerPeriodoEscolhido, type Periodo } from "@/api/servicos/periodo";

/** Período escolhido no topo (cookie), com o padrão da configuração como reserva. */
export async function lerPeriodoDaRequisicao(periodoPadrao: number): Promise<Periodo> {
  const loja = await cookies();
  return lerPeriodoEscolhido(loja.get(COOKIE_PERIODO)?.value, periodoPadrao);
}
