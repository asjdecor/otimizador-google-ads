import { z } from "zod";
import type { IntervaloDeDatas } from "@/api/servicos/periodo";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "./api-google-ads";
import { microsParaReais, type MetricasBasicas } from "./metricas";

/** O que já foi feito com o termo na conta (enum SearchTermTargetingStatus). */
export type SituacaoDoTermo = "ADICIONADO" | "EXCLUIDO" | "ADICIONADO_E_EXCLUIDO" | "NENHUMA";

export interface TermoDePesquisa extends MetricasBasicas {
  termo: string;
  situacao: SituacaoDoTermo;
  grupoId: string;
  grupoNome: string;
  campanhaNome: string;
}

export function montarGaqlDeTermos(intervalo: IntervaloDeDatas): string {
  return `SELECT search_term_view.search_term, search_term_view.status, ad_group.id, ad_group.name, campaign.name,
  metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
FROM search_term_view
WHERE segments.date BETWEEN '${intervalo.inicio}' AND '${intervalo.fim}' AND metrics.impressions > 0`;
}

/** 2 ADDED, 3 EXCLUDED, 4 ADDED_EXCLUDED, 5 NONE. */
const SITUACOES: Record<string, SituacaoDoTermo> = {
  "2": "ADICIONADO",
  ADDED: "ADICIONADO",
  "3": "EXCLUIDO",
  EXCLUDED: "EXCLUIDO",
  "4": "ADICIONADO_E_EXCLUIDO",
  ADDED_EXCLUDED: "ADICIONADO_E_EXCLUIDO",
};

const numero = z.coerce.number().catch(0);
const esquemaLinhaTermo = z.object({
  search_term_view: z.object({
    search_term: z.string().min(1),
    status: z.union([z.number(), z.string()]).nullish(),
  }),
  ad_group: z.object({ id: z.union([z.number(), z.string()]).transform(String), name: z.string().nullish() }),
  campaign: z.object({ name: z.string().nullish() }).default({}),
  metrics: z
    .object({ impressions: numero, clicks: numero, cost_micros: numero, conversions: numero })
    .partial()
    .default({}),
});

export function mapearLinhasDeTermo(linhas: unknown[]): TermoDePesquisa[] {
  return linhas.flatMap((linha) => {
    const r = esquemaLinhaTermo.safeParse(linha);
    if (!r.success) return [];
    const { search_term_view: termo, ad_group: grupo, campaign, metrics } = r.data;
    return [
      {
        termo: termo.search_term,
        situacao: SITUACOES[String(termo.status)] ?? "NENHUMA",
        grupoId: grupo.id,
        grupoNome: grupo.name ?? "",
        campanhaNome: campaign.name ?? "",
        impressoes: metrics.impressions ?? 0,
        cliques: metrics.clicks ?? 0,
        custo: microsParaReais(metrics.cost_micros ?? 0),
        conversoes: metrics.conversions ?? 0,
      },
    ];
  });
}

export async function buscarTermosDePesquisa(api: ApiGoogleAds, credenciais: CredenciaisDeConsulta, intervalo: IntervaloDeDatas) {
  return mapearLinhasDeTermo(await api.consultar(credenciais, montarGaqlDeTermos(intervalo)));
}
