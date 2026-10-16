import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/api/banco/prisma";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "@/api/integracoes/google-ads/api-google-ads";
import {
  buscarMetricasDeAnuncios,
  buscarMetricasDeCampanhas,
  buscarMetricasDePalavrasChave,
  montarGaqlDeAnuncios,
  montarGaqlDeCampanhas,
  montarGaqlDePalavrasChave,
  type MetricasBasicas,
  type MetricasDeCampanha,
  type MetricasDePalavraChave,
} from "@/api/integracoes/google-ads/metricas";
import { consultarComCache, montarChaveDoCache } from "./cache";
import {
  calcularMetricasDerivadas,
  encontrarAnunciosComCtrBaixo,
  encontrarPalavrasChaveQueDesperdicam,
  somarGastoSemConversao,
  somarMetricas,
  type AnuncioComCtrBaixo,
  type MetricasDerivadas,
} from "./desperdicio";
import { calcularIntervaloDoPeriodo, type IntervaloDeDatas, type Periodo } from "./periodo";

export interface DadosDoPainel {
  intervalo: IntervaloDeDatas;
  totais: MetricasBasicas & MetricasDerivadas;
  campanhas: (MetricasDeCampanha & MetricasDerivadas)[];
  gastoSemConversao: number;
  palavrasQueDesperdicam: MetricasDePalavraChave[];
  anunciosComCtrBaixo: AnuncioComCtrBaixo[];
}

/** Junta as 3 consultas (com cache de 15 min) e aplica as regras de F2. */
export async function carregarDadosDoPainel(
  entrada: {
    api: ApiGoogleAds;
    credenciais: CredenciaisDeConsulta;
    periodo: Periodo;
    limiteDesperdicio: number;
    hoje?: Date;
  },
  banco: PrismaClient = prisma,
): Promise<DadosDoPainel> {
  const { api, credenciais } = entrada;
  const intervalo = calcularIntervaloDoPeriodo(entrada.periodo, entrada.hoje);
  const comCache = <T>(gaql: string, buscar: () => Promise<T>) =>
    consultarComCache({ chave: montarChaveDoCache(credenciais.customerId, gaql), buscar }, banco);

  const [campanhas, palavras, anuncios] = await Promise.all([
    comCache(montarGaqlDeCampanhas(intervalo), () => buscarMetricasDeCampanhas(api, credenciais, intervalo)),
    comCache(montarGaqlDePalavrasChave(intervalo), () => buscarMetricasDePalavrasChave(api, credenciais, intervalo)),
    comCache(montarGaqlDeAnuncios(intervalo), () => buscarMetricasDeAnuncios(api, credenciais, intervalo)),
  ]);

  const totais = somarMetricas(campanhas);
  return {
    intervalo,
    totais: { ...totais, ...calcularMetricasDerivadas(totais) },
    campanhas: campanhas
      .map((c) => ({ ...c, ...calcularMetricasDerivadas(c) }))
      .sort((a, b) => b.custo - a.custo),
    gastoSemConversao: somarGastoSemConversao(palavras),
    palavrasQueDesperdicam: encontrarPalavrasChaveQueDesperdicam(palavras, entrada.limiteDesperdicio),
    anunciosComCtrBaixo: encontrarAnunciosComCtrBaixo(anuncios),
  };
}
