import type {
  MetricasBasicas,
  MetricasDeAnuncio,
  MetricasDePalavraChave,
} from "@/api/integracoes/google-ads/metricas";

export interface MetricasDerivadas {
  /** Fração (0.034 = 3,4%). Null quando não houve impressão. */
  ctr: number | null;
  cpcMedio: number | null;
  custoPorConversao: number | null;
}

/** CTR, CPC e custo/conversão calculados a partir das somas (não da média de médias). */
export function calcularMetricasDerivadas(m: MetricasBasicas): MetricasDerivadas {
  return {
    ctr: m.impressoes > 0 ? m.cliques / m.impressoes : null,
    cpcMedio: m.cliques > 0 ? m.custo / m.cliques : null,
    custoPorConversao: m.conversoes > 0 ? m.custo / m.conversoes : null,
  };
}

export function somarMetricas(itens: MetricasBasicas[]): MetricasBasicas {
  return itens.reduce(
    (total, item) => ({
      impressoes: total.impressoes + item.impressoes,
      cliques: total.cliques + item.cliques,
      custo: total.custo + item.custo,
      conversoes: total.conversoes + item.conversoes,
    }),
    { impressoes: 0, cliques: 0, custo: 0, conversoes: 0 },
  );
}

/** F2.2 — palavras com custo ACIMA do limite e zero conversões, da mais cara para a mais barata. */
export function encontrarPalavrasChaveQueDesperdicam(
  palavras: MetricasDePalavraChave[],
  limiteEmReais: number,
): MetricasDePalavraChave[] {
  return palavras.filter((p) => p.conversoes === 0 && p.custo > limiteEmReais).sort((a, b) => b.custo - a.custo);
}

/** F2.4 — tudo o que foi gasto em palavras-chave que não converteram (independe do limite). */
export function somarGastoSemConversao(palavras: MetricasDePalavraChave[]): number {
  return palavras.filter((p) => p.conversoes === 0).reduce((total, p) => total + p.custo, 0);
}

export interface AnuncioComCtrBaixo extends MetricasDeAnuncio {
  ctr: number;
  ctrMedioDoGrupo: number;
}

export const REGRA_CTR_BAIXO = { fatorDaMedia: 0.7, impressoesMinimas: 100 } as const;

/**
 * F2.3 — anúncios com CTR menor que 70% do CTR do próprio grupo e pelo menos 100 impressões.
 * O CTR do grupo é cliques/impressões somados de todos os anúncios do grupo (média ponderada).
 * Ordena do pior (mais longe da média) para o menos pior.
 */
export function encontrarAnunciosComCtrBaixo(
  anuncios: MetricasDeAnuncio[],
  regra: { fatorDaMedia: number; impressoesMinimas: number } = REGRA_CTR_BAIXO,
): AnuncioComCtrBaixo[] {
  const grupos = new Map<string, MetricasDeAnuncio[]>();
  for (const anuncio of anuncios) {
    grupos.set(anuncio.grupoId, [...(grupos.get(anuncio.grupoId) ?? []), anuncio]);
  }

  const resultado: AnuncioComCtrBaixo[] = [];
  for (const doGrupo of grupos.values()) {
    const total = somarMetricas(doGrupo);
    if (total.impressoes === 0) continue;
    const ctrMedioDoGrupo = total.cliques / total.impressoes;
    for (const anuncio of doGrupo) {
      if (anuncio.impressoes < regra.impressoesMinimas) continue;
      const ctr = anuncio.cliques / anuncio.impressoes;
      if (ctr < ctrMedioDoGrupo * regra.fatorDaMedia) {
        resultado.push({ ...anuncio, ctr, ctrMedioDoGrupo });
      }
    }
  }
  return resultado.sort((a, b) => a.ctr / a.ctrMedioDoGrupo - b.ctr / b.ctrMedioDoGrupo);
}
