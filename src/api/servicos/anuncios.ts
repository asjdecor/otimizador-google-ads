import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/api/banco/prisma";
import {
  buscarAnunciosRsa,
  buscarPalavrasPorGrupo,
  GAQL_ANUNCIOS_RSA,
  GAQL_PALAVRAS_DOS_GRUPOS,
  type AnuncioRsa,
} from "@/api/integracoes/google-ads/anuncios";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "@/api/integracoes/google-ads/api-google-ads";
import {
  buscarMetricasDeAnuncios,
  montarGaqlDeAnuncios,
  type MetricasDeAnuncio,
} from "@/api/integracoes/google-ads/metricas";
import { consultarComCache, montarChaveDoCache } from "./cache";
import { calcularMetricasDerivadas, type MetricasDerivadas } from "./desperdicio";
import { calcularNotaDoAnuncio, type Diagnostico } from "./diagnostico";
import { calcularIntervaloDoPeriodo, type IntervaloDeDatas, type Periodo } from "./periodo";

export interface AnuncioAvaliado {
  id: string;
  anuncio: AnuncioRsa;
  palavrasDoGrupo: string[];
  diagnostico: Diagnostico;
  /** Null quando o anúncio não teve impressões no período. */
  metricas: (MetricasDeAnuncio & MetricasDerivadas) | null;
}

/** Id usado na URL: "grupo~anuncio" (o mesmo formato dos resource names do Google). */
export function montarIdDoAnuncio(grupoId: string, anuncioId: string): string {
  return `${grupoId}~${anuncioId}`;
}

export function idDoAnuncioEhValido(id: string): boolean {
  return /^\d+~\d+$/.test(id);
}

interface EntradaDosAnuncios {
  api: ApiGoogleAds;
  credenciais: CredenciaisDeConsulta;
  periodo: Periodo;
  hoje?: Date;
}

/** Todos os RSA da conta com nota e métricas do período, piores notas primeiro. */
export async function carregarAnunciosAvaliados(
  entrada: EntradaDosAnuncios,
  banco: PrismaClient = prisma,
): Promise<{ intervalo: IntervaloDeDatas; anuncios: AnuncioAvaliado[] }> {
  const { api, credenciais } = entrada;
  const intervalo = calcularIntervaloDoPeriodo(entrada.periodo, entrada.hoje);
  const comCache = <T>(gaql: string, buscar: () => Promise<T>) =>
    consultarComCache({ chave: montarChaveDoCache(credenciais.customerId, gaql), buscar }, banco);

  const [anuncios, palavrasPorGrupo, metricas] = await Promise.all([
    comCache(GAQL_ANUNCIOS_RSA, () => buscarAnunciosRsa(api, credenciais)),
    comCache(GAQL_PALAVRAS_DOS_GRUPOS, () => buscarPalavrasPorGrupo(api, credenciais)),
    // mesma consulta do painel → reaproveita o cache dele
    comCache(montarGaqlDeAnuncios(intervalo), () => buscarMetricasDeAnuncios(api, credenciais, intervalo)),
  ]);

  const metricasPorId = new Map(metricas.map((m) => [montarIdDoAnuncio(m.grupoId, m.anuncioId), m]));
  const avaliados = anuncios.map((anuncio): AnuncioAvaliado => {
    const id = montarIdDoAnuncio(anuncio.grupoId, anuncio.anuncioId);
    const palavrasDoGrupo = palavrasPorGrupo[anuncio.grupoId] ?? [];
    const doPeriodo = metricasPorId.get(id);
    return {
      id,
      anuncio,
      palavrasDoGrupo,
      diagnostico: calcularNotaDoAnuncio(anuncio, palavrasDoGrupo),
      metricas: doPeriodo ? { ...doPeriodo, ...calcularMetricasDerivadas(doPeriodo) } : null,
    };
  });

  avaliados.sort((a, b) => a.diagnostico.nota - b.diagnostico.nota || (b.metricas?.custo ?? 0) - (a.metricas?.custo ?? 0));
  return { intervalo, anuncios: avaliados };
}

/** Um anúncio pelo id da URL; null se não existir (ou não for RSA). */
export async function carregarAnuncioAvaliado(
  id: string,
  entrada: EntradaDosAnuncios,
  banco: PrismaClient = prisma,
): Promise<{ intervalo: IntervaloDeDatas; anuncio: AnuncioAvaliado | null }> {
  if (!idDoAnuncioEhValido(id)) return { intervalo: calcularIntervaloDoPeriodo(entrada.periodo, entrada.hoje), anuncio: null };
  const { intervalo, anuncios } = await carregarAnunciosAvaliados(entrada, banco);
  return { intervalo, anuncio: anuncios.find((a) => a.id === id) ?? null };
}
