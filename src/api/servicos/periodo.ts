export const PERIODOS_DISPONIVEIS = [7, 30, 90] as const;
export type Periodo = (typeof PERIODOS_DISPONIVEIS)[number];
export const COOKIE_PERIODO = "periodo";

export interface IntervaloDeDatas {
  /** AAAA-MM-DD */
  inicio: string;
  /** AAAA-MM-DD */
  fim: string;
}

function ehPeriodoValido(valor: number): valor is Periodo {
  return (PERIODOS_DISPONIVEIS as readonly number[]).includes(valor);
}

/** Lê o período do cookie; valor ausente ou estranho cai no padrão (e o padrão inválido cai em 30). */
export function lerPeriodoEscolhido(valor: string | undefined, padrao: number): Periodo {
  const numero = Number(valor);
  if (ehPeriodoValido(numero)) return numero;
  return ehPeriodoValido(padrao) ? padrao : 30;
}

function formatarDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Últimos N dias completos, terminando ontem (igual ao "Últimos 30 dias" do Google Ads,
 * que não conta o dia de hoje porque ele ainda está incompleto).
 */
export function calcularIntervaloDoPeriodo(dias: Periodo, hoje: Date = new Date()): IntervaloDeDatas {
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const inicio = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate() - (dias - 1));
  return { inicio: formatarDataLocal(inicio), fim: formatarDataLocal(fim) };
}
