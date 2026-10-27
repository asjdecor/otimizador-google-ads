import { z } from "zod";
import { normalizarTexto } from "@/api/servicos/diagnostico";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "./api-google-ads";
import { microsParaReais } from "./metricas";

export type Concorrencia = "BAIXA" | "MEDIA" | "ALTA" | "SEM_DADOS";

export interface IdeiaDePalavra {
  texto: string;
  volumeMensal: number | null;
  concorrencia: Concorrencia;
  /** Lances de topo de página, em reais. */
  lanceBaixo: number | null;
  lanceAlto: number | null;
}

export interface PedidoDeIdeias {
  urlSemente?: string;
  palavrasSemente: string[];
  /** IDs de localização, ex.: "1001773" (São Paulo). */
  idsGeo: string[];
  /** ID do idioma, ex.: "1014" (português). */
  idioma: string;
}

/** 2 LOW, 3 MEDIUM, 4 HIGH (enum KeywordPlanCompetitionLevel). */
const CONCORRENCIAS: Record<string, Concorrencia> = {
  "2": "BAIXA",
  LOW: "BAIXA",
  "3": "MEDIA",
  MEDIUM: "MEDIA",
  "4": "ALTA",
  HIGH: "ALTA",
};

const numeroOuNulo = z.coerce.number().nullable().catch(null);
const esquemaIdeia = z.object({
  text: z.string().trim().min(1),
  keyword_idea_metrics: z
    .object({
      avg_monthly_searches: numeroOuNulo,
      competition: z.union([z.number(), z.string()]).nullish(),
      low_top_of_page_bid_micros: numeroOuNulo,
      high_top_of_page_bid_micros: numeroOuNulo,
    })
    .partial()
    .nullish(),
});
const esquemaResposta = z.object({ results: z.array(z.unknown()) });

function emReais(micros: number | null | undefined): number | null {
  return micros == null ? null : microsParaReais(micros);
}

export function mapearIdeiasDePalavras(resposta: unknown): IdeiaDePalavra[] {
  const lida = esquemaResposta.safeParse(resposta);
  if (!lida.success) return [];
  const vistos = new Set<string>();
  return lida.data.results.flatMap((linha) => {
    const r = esquemaIdeia.safeParse(linha);
    if (!r.success) return [];
    const chave = normalizarTexto(r.data.text);
    if (vistos.has(chave)) return [];
    vistos.add(chave);
    const metricas = r.data.keyword_idea_metrics;
    return [
      {
        texto: r.data.text,
        volumeMensal: metricas?.avg_monthly_searches ?? null,
        concorrencia: CONCORRENCIAS[String(metricas?.competition)] ?? "SEM_DADOS",
        lanceBaixo: emReais(metricas?.low_top_of_page_bid_micros),
        lanceAlto: emReais(metricas?.high_top_of_page_bid_micros),
      },
    ];
  });
}

export async function buscarIdeiasDePalavras(
  api: ApiGoogleAds,
  credenciais: CredenciaisDeConsulta,
  pedido: PedidoDeIdeias,
): Promise<IdeiaDePalavra[]> {
  return mapearIdeiasDePalavras(await api.gerarIdeiasDePalavras(credenciais, pedido));
}
