import { z } from "zod";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "./api-google-ads";

/** Onde e em que idioma a conta já anuncia (campanhas de pesquisa ativas). */
export interface Segmentacao {
  idsGeo: string[];
  nomesGeo: string[];
  idiomas: string[];
}

const IDIOMA_PADRAO = "1014"; // português

export const GAQL_SEGMENTACAO = `SELECT campaign_criterion.type, campaign_criterion.location.geo_target_constant,
  campaign_criterion.language.language_constant, campaign_criterion.negative
FROM campaign_criterion
WHERE campaign.status = 'ENABLED' AND campaign.advertising_channel_type = 'SEARCH'
  AND campaign_criterion.type IN ('LOCATION', 'LANGUAGE') AND campaign_criterion.negative = FALSE`;

export const GAQL_URLS_FINAIS = `SELECT ad_group_ad.ad.final_urls
FROM ad_group_ad
WHERE ad_group_ad.status = 'ENABLED' AND campaign.status = 'ENABLED'`;

/** Os ids entram direto na consulta; por isso só aceitamos dígitos. */
export function montarGaqlNomesGeo(idsGeo: string[]): string {
  const invalido = idsGeo.find((id) => !/^\d+$/.test(id));
  if (invalido !== undefined) throw new Error(`Id de região inválido: ${invalido}`);
  const lista = idsGeo.map((id) => `'geoTargetConstants/${id}'`).join(", ");
  return `SELECT geo_target_constant.canonical_name FROM geo_target_constant WHERE geo_target_constant.resource_name IN (${lista})`;
}

const esquemaCriterio = z.object({
  campaign_criterion: z.object({
    negative: z.boolean().nullish(),
    location: z.object({ geo_target_constant: z.string().nullish() }).nullish(),
    language: z.object({ language_constant: z.string().nullish() }).nullish(),
  }),
});

/** "geoTargetConstants/1001773" -> "1001773". */
const idDoRecurso = (recurso: string | null | undefined) => recurso?.split("/").pop() ?? null;

export function mapearSegmentacao(linhas: unknown[]): Segmentacao {
  const geo = new Set<string>();
  const idiomas = new Set<string>();
  for (const linha of linhas) {
    const r = esquemaCriterio.safeParse(linha);
    if (!r.success || r.data.campaign_criterion.negative) continue;
    const { location, language } = r.data.campaign_criterion;
    const idGeo = idDoRecurso(location?.geo_target_constant);
    const idIdioma = idDoRecurso(language?.language_constant);
    if (idGeo) geo.add(idGeo);
    if (idIdioma) idiomas.add(idIdioma);
  }
  return { idsGeo: [...geo], nomesGeo: [], idiomas: idiomas.size > 0 ? [...idiomas] : [IDIOMA_PADRAO] };
}

const esquemaUrls = z.object({
  ad_group_ad: z.object({ ad: z.object({ final_urls: z.array(z.string()).nullish() }) }),
});

/** Domínio (sem "www.", minúsculo) que mais aparece nas URLs finais dos anúncios. */
export function extrairDominioPrincipal(linhas: unknown[]): string | null {
  const contagem = new Map<string, number>();
  for (const linha of linhas) {
    const r = esquemaUrls.safeParse(linha);
    if (!r.success) continue;
    for (const url of r.data.ad_group_ad.ad.final_urls ?? []) {
      const dominio = normalizarDominio(url);
      if (dominio) contagem.set(dominio, (contagem.get(dominio) ?? 0) + 1);
    }
  }
  let melhor: string | null = null;
  let maior = 0;
  for (const [dominio, quantas] of contagem) {
    if (quantas > maior) {
      melhor = dominio;
      maior = quantas;
    }
  }
  return melhor;
}

/** "https://WWW.Loja.com.br/x" -> "loja.com.br". Devolve null se não parecer um domínio. */
export function normalizarDominio(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto) return null;
  const comProtocolo = /^[a-z][a-z0-9+.-]*:\/\//i.test(texto) ? texto : `https://${texto}`;
  try {
    const url = new URL(comProtocolo);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

export async function buscarSegmentacao(api: ApiGoogleAds, credenciais: CredenciaisDeConsulta): Promise<Segmentacao> {
  const segmentacao = mapearSegmentacao(await api.consultar(credenciais, GAQL_SEGMENTACAO));
  if (segmentacao.idsGeo.length === 0) return segmentacao;
  const linhas = await api.consultar(credenciais, montarGaqlNomesGeo(segmentacao.idsGeo));
  const nomesGeo = linhas.flatMap((linha) => {
    const r = z.object({ geo_target_constant: z.object({ canonical_name: z.string().min(1) }) }).safeParse(linha);
    return r.success ? [r.data.geo_target_constant.canonical_name] : [];
  });
  return { ...segmentacao, nomesGeo };
}

export async function buscarDominioPrincipal(api: ApiGoogleAds, credenciais: CredenciaisDeConsulta): Promise<string | null> {
  return extrairDominioPrincipal(await api.consultar(credenciais, GAQL_URLS_FINAIS));
}
