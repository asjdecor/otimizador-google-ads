import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/api/banco/prisma";
import { buscarPalavrasPorGrupo, GAQL_PALAVRAS_DOS_GRUPOS, type PalavrasPorGrupo } from "@/api/integracoes/google-ads/anuncios";
import type { ApiGoogleAds, CredenciaisDeConsulta } from "@/api/integracoes/google-ads/api-google-ads";
import { buscarTermosDePesquisa, montarGaqlDeTermos, type TermoDePesquisa } from "@/api/integracoes/google-ads/termos";
import { consultarComCache, montarChaveDoCache } from "./cache";
import { calcularIntervaloDoPeriodo, type IntervaloDeDatas, type Periodo } from "./periodo";
import {
  somarGastoDeTermosSemConversao,
  sugerirNegativasPorRegra,
  sugerirPalavrasNovasPorRegra,
  type SugestaoDeNegativa,
  type SugestaoDePalavraNova,
} from "./termos";

export interface DadosDosTermos {
  intervalo: IntervaloDeDatas;
  termos: TermoDePesquisa[];
  palavrasPorGrupo: PalavrasPorGrupo;
  gastoSemConversao: number;
  negativasPorRegra: SugestaoDeNegativa[];
  novasPorRegra: SugestaoDePalavraNova[];
}

/** F5 — termos do período + palavras dos grupos (ambos com cache de 15 min) e as sugestões por regra. */
export async function carregarDadosDosTermos(
  entrada: { api: ApiGoogleAds; credenciais: CredenciaisDeConsulta; periodo: Periodo; hoje?: Date },
  banco: PrismaClient = prisma,
): Promise<DadosDosTermos> {
  const { api, credenciais } = entrada;
  const intervalo = calcularIntervaloDoPeriodo(entrada.periodo, entrada.hoje);
  const comCache = <T>(gaql: string, buscar: () => Promise<T>) =>
    consultarComCache({ chave: montarChaveDoCache(credenciais.customerId, gaql), buscar }, banco);

  const [termos, palavrasPorGrupo] = await Promise.all([
    comCache(montarGaqlDeTermos(intervalo), () => buscarTermosDePesquisa(api, credenciais, intervalo)),
    comCache(GAQL_PALAVRAS_DOS_GRUPOS, () => buscarPalavrasPorGrupo(api, credenciais)),
  ]);

  return {
    intervalo,
    termos: [...termos].sort((a, b) => b.custo - a.custo),
    palavrasPorGrupo,
    gastoSemConversao: somarGastoDeTermosSemConversao(termos),
    negativasPorRegra: sugerirNegativasPorRegra(termos),
    novasPorRegra: sugerirPalavrasNovasPorRegra(termos, palavrasPorGrupo),
  };
}
