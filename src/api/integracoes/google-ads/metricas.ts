import { z } from "zod";
import type { IntervaloDeDatas } from "@/api/servicos/periodo";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "./api-google-ads";

/**
 * Valores de dinheiro da API vêm em micros (1 real = 1.000.000). Converta SÓ aqui.
 * Sem arredondar: somas de muitas linhas arredondadas sairiam diferentes do Google Ads.
 */
export function microsParaReais(micros: number): number {
  return micros / 1_000_000;
}

export interface MetricasBasicas {
  impressoes: number;
  cliques: number;
  custo: number;
  conversoes: number;
}

export interface MetricasDeCampanha extends MetricasBasicas {
  campanhaId: string;
  nome: string;
  status: string;
}

export interface MetricasDePalavraChave extends MetricasBasicas {
  criterioId: string;
  texto: string;
  correspondencia: string;
  grupoId: string;
  grupoNome: string;
  campanhaNome: string;
}

export interface MetricasDeAnuncio extends MetricasBasicas {
  anuncioId: string;
  titulo: string;
  grupoId: string;
  grupoNome: string;
  campanhaNome: string;
}

// ---------- GAQL (somente leitura) ----------

const filtroDeDatas = (intervalo: IntervaloDeDatas) => `segments.date BETWEEN '${intervalo.inicio}' AND '${intervalo.fim}'`;

const camposDeMetricas = "metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions";

export function montarGaqlDeCampanhas(intervalo: IntervaloDeDatas): string {
  return `SELECT campaign.id, campaign.name, campaign.status, ${camposDeMetricas}
FROM campaign
WHERE ${filtroDeDatas(intervalo)} AND campaign.status != 'REMOVED'`;
}

export function montarGaqlDePalavrasChave(intervalo: IntervaloDeDatas): string {
  return `SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
  ad_group.id, ad_group.name, campaign.name, ${camposDeMetricas}
FROM keyword_view
WHERE ${filtroDeDatas(intervalo)} AND ad_group_criterion.status != 'REMOVED' AND metrics.impressions > 0`;
}

export function montarGaqlDeAnuncios(intervalo: IntervaloDeDatas): string {
  return `SELECT ad_group_ad.ad.id, ad_group_ad.ad.responsive_search_ad.headlines,
  ad_group.id, ad_group.name, campaign.name, ${camposDeMetricas}
FROM ad_group_ad
WHERE ${filtroDeDatas(intervalo)} AND ad_group_ad.status != 'REMOVED' AND metrics.impressions > 0`;
}

// ---------- Mapeadores (validados com Zod; linhas fora do formato são ignoradas) ----------

const id = z.union([z.number(), z.string()]).transform(String);
const numero = z.coerce.number().catch(0);

const esquemaMetricas = z
  .object({ impressions: numero, clicks: numero, cost_micros: numero, conversions: numero })
  .partial()
  .default({});

function lerMetricas(metricas: z.infer<typeof esquemaMetricas>): MetricasBasicas {
  return {
    impressoes: metricas.impressions ?? 0,
    cliques: metricas.clicks ?? 0,
    custo: microsParaReais(metricas.cost_micros ?? 0),
    conversoes: metricas.conversions ?? 0,
  };
}

/** A biblioteca devolve enums como número; aceitamos número ou texto. */
const NOMES_STATUS_CAMPANHA: Record<string, string> = { "2": "Ativa", ENABLED: "Ativa", "3": "Pausada", PAUSED: "Pausada" };
const NOMES_CORRESPONDENCIA: Record<string, string> = {
  "2": "Exata",
  EXACT: "Exata",
  "3": "Frase",
  PHRASE: "Frase",
  "4": "Ampla",
  BROAD: "Ampla",
};

const esquemaLinhaCampanha = z.object({
  campaign: z.object({ id, name: z.string().nullish(), status: z.union([z.number(), z.string()]).nullish() }),
  metrics: esquemaMetricas,
});

const esquemaLinhaPalavra = z.object({
  ad_group_criterion: z.object({
    criterion_id: id,
    keyword: z.object({ text: z.string(), match_type: z.union([z.number(), z.string()]).nullish() }),
  }),
  ad_group: z.object({ id, name: z.string().nullish() }),
  campaign: z.object({ name: z.string().nullish() }).default({}),
  metrics: esquemaMetricas,
});

const esquemaLinhaAnuncio = z.object({
  ad_group_ad: z.object({
    ad: z.object({
      id,
      responsive_search_ad: z
        .object({ headlines: z.array(z.object({ text: z.string().nullish() })).nullish() })
        .nullish(),
    }),
  }),
  ad_group: z.object({ id, name: z.string().nullish() }),
  campaign: z.object({ name: z.string().nullish() }).default({}),
  metrics: esquemaMetricas,
});

function mapearValidas<E extends z.ZodType, S>(linhas: unknown[], esquema: E, mapear: (linha: z.infer<E>) => S): S[] {
  return linhas.flatMap((linha) => {
    const resultado = esquema.safeParse(linha);
    return resultado.success ? [mapear(resultado.data)] : [];
  });
}

export function mapearLinhasDeCampanha(linhas: unknown[]): MetricasDeCampanha[] {
  return mapearValidas(linhas, esquemaLinhaCampanha, (l) => ({
    campanhaId: l.campaign.id,
    nome: l.campaign.name ?? `Campanha ${l.campaign.id}`,
    status: NOMES_STATUS_CAMPANHA[String(l.campaign.status)] ?? "Outro",
    ...lerMetricas(l.metrics),
  }));
}

export function mapearLinhasDePalavraChave(linhas: unknown[]): MetricasDePalavraChave[] {
  return mapearValidas(linhas, esquemaLinhaPalavra, (l) => ({
    criterioId: l.ad_group_criterion.criterion_id,
    texto: l.ad_group_criterion.keyword.text,
    correspondencia: NOMES_CORRESPONDENCIA[String(l.ad_group_criterion.keyword.match_type)] ?? "Outra",
    grupoId: l.ad_group.id,
    grupoNome: l.ad_group.name ?? "",
    campanhaNome: l.campaign.name ?? "",
    ...lerMetricas(l.metrics),
  }));
}

export function mapearLinhasDeAnuncio(linhas: unknown[]): MetricasDeAnuncio[] {
  return mapearValidas(linhas, esquemaLinhaAnuncio, (l) => {
    const primeiroTitulo = l.ad_group_ad.ad.responsive_search_ad?.headlines?.find((h) => h.text)?.text;
    return {
      anuncioId: l.ad_group_ad.ad.id,
      titulo: primeiroTitulo ?? `Anúncio ${l.ad_group_ad.ad.id}`,
      grupoId: l.ad_group.id,
      grupoNome: l.ad_group.name ?? "",
      campanhaNome: l.campaign.name ?? "",
      ...lerMetricas(l.metrics),
    };
  });
}

// ---------- Busca (consulta + mapeamento) ----------

export async function buscarMetricasDeCampanhas(api: ApiGoogleAds, credenciais: CredenciaisDeConsulta, intervalo: IntervaloDeDatas) {
  return mapearLinhasDeCampanha(await api.consultar(credenciais, montarGaqlDeCampanhas(intervalo)));
}

export async function buscarMetricasDePalavrasChave(api: ApiGoogleAds, credenciais: CredenciaisDeConsulta, intervalo: IntervaloDeDatas) {
  return mapearLinhasDePalavraChave(await api.consultar(credenciais, montarGaqlDePalavrasChave(intervalo)));
}

export async function buscarMetricasDeAnuncios(api: ApiGoogleAds, credenciais: CredenciaisDeConsulta, intervalo: IntervaloDeDatas) {
  return mapearLinhasDeAnuncio(await api.consultar(credenciais, montarGaqlDeAnuncios(intervalo)));
}
