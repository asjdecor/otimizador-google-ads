import { z } from "zod";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "./api-google-ads";

export type ForcaDoAnuncio = "EXCELENTE" | "BOA" | "MEDIA" | "RUIM" | "PENDENTE" | "SEM_DADOS";

export interface AnuncioRsa {
  anuncioId: string;
  grupoId: string;
  grupoNome: string;
  campanhaNome: string;
  status: "Ativo" | "Pausado" | "Outro";
  titulos: string[];
  descricoes: string[];
  urlFinal: string | null;
  forca: ForcaDoAnuncio;
}

/** grupoId → textos das palavras-chave positivas do grupo. */
export type PalavrasPorGrupo = Record<string, string[]>;

// ---------- GAQL (somente leitura; sem período: é a "foto" atual dos anúncios) ----------

export const GAQL_ANUNCIOS_RSA = `SELECT ad_group_ad.ad.id, ad_group_ad.ad.responsive_search_ad.headlines,
  ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.ad.final_urls, ad_group_ad.ad_strength,
  ad_group_ad.status, ad_group.id, ad_group.name, campaign.name
FROM ad_group_ad
WHERE ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD' AND ad_group_ad.status != 'REMOVED'
  AND ad_group.status != 'REMOVED' AND campaign.status != 'REMOVED'`;

export const GAQL_PALAVRAS_DOS_GRUPOS = `SELECT ad_group.id, ad_group_criterion.keyword.text
FROM ad_group_criterion
WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = FALSE
  AND ad_group_criterion.status != 'REMOVED' AND ad_group.status != 'REMOVED'`;

// ---------- Mapeadores ----------

const id = z.union([z.number(), z.string()]).transform(String);
const enumOuTexto = z.union([z.number(), z.string()]).nullish();
const listaDeTextos = z
  .array(z.object({ text: z.string().nullish() }))
  .nullish()
  .transform((itens) => (itens ?? []).map((i) => i.text ?? "").filter((t) => t.trim() !== ""));

/** Enum AdStrength da API: 2 PENDING, 3 NO_ADS, 4 POOR, 5 AVERAGE, 6 GOOD, 7 EXCELLENT. */
const FORCAS: Record<string, ForcaDoAnuncio> = {
  "2": "PENDENTE",
  PENDING: "PENDENTE",
  "4": "RUIM",
  POOR: "RUIM",
  "5": "MEDIA",
  AVERAGE: "MEDIA",
  "6": "BOA",
  GOOD: "BOA",
  "7": "EXCELENTE",
  EXCELLENT: "EXCELENTE",
};
const STATUS_ANUNCIO: Record<string, AnuncioRsa["status"]> = { "2": "Ativo", ENABLED: "Ativo", "3": "Pausado", PAUSED: "Pausado" };

const esquemaLinhaRsa = z.object({
  ad_group_ad: z.object({
    ad: z.object({
      id,
      responsive_search_ad: z.object({ headlines: listaDeTextos, descriptions: listaDeTextos }).nullish(),
      final_urls: z.array(z.string()).nullish(),
    }),
    ad_strength: enumOuTexto,
    status: enumOuTexto,
  }),
  ad_group: z.object({ id, name: z.string().nullish() }),
  campaign: z.object({ name: z.string().nullish() }).default({}),
});

const esquemaLinhaPalavraDoGrupo = z.object({
  ad_group: z.object({ id }),
  ad_group_criterion: z.object({ keyword: z.object({ text: z.string() }) }),
});

export function mapearLinhasDeAnuncioRsa(linhas: unknown[]): AnuncioRsa[] {
  return linhas.flatMap((linha) => {
    const r = esquemaLinhaRsa.safeParse(linha);
    if (!r.success) return [];
    const { ad_group_ad: aga, ad_group: grupo, campaign } = r.data;
    return [
      {
        anuncioId: aga.ad.id,
        grupoId: grupo.id,
        grupoNome: grupo.name ?? "",
        campanhaNome: campaign.name ?? "",
        status: STATUS_ANUNCIO[String(aga.status)] ?? "Outro",
        titulos: aga.ad.responsive_search_ad?.headlines ?? [],
        descricoes: aga.ad.responsive_search_ad?.descriptions ?? [],
        urlFinal: aga.ad.final_urls?.[0] ?? null,
        forca: FORCAS[String(aga.ad_strength)] ?? "SEM_DADOS",
      },
    ];
  });
}

export function mapearPalavrasPorGrupo(linhas: unknown[]): PalavrasPorGrupo {
  const resultado: PalavrasPorGrupo = {};
  for (const linha of linhas) {
    const r = esquemaLinhaPalavraDoGrupo.safeParse(linha);
    if (!r.success) continue;
    const lista = (resultado[r.data.ad_group.id] ??= []);
    if (!lista.includes(r.data.ad_group_criterion.keyword.text)) lista.push(r.data.ad_group_criterion.keyword.text);
  }
  return resultado;
}

export async function buscarAnunciosRsa(api: ApiGoogleAds, credenciais: CredenciaisDeConsulta) {
  return mapearLinhasDeAnuncioRsa(await api.consultar(credenciais, GAQL_ANUNCIOS_RSA));
}

export async function buscarPalavrasPorGrupo(api: ApiGoogleAds, credenciais: CredenciaisDeConsulta) {
  return mapearPalavrasPorGrupo(await api.consultar(credenciais, GAQL_PALAVRAS_DOS_GRUPOS));
}
