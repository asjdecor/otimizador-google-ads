import type { TermoDePesquisa } from "@/api/integracoes/google-ads/termos";
import type { PalavrasPorGrupo } from "@/api/integracoes/google-ads/anuncios";
import { normalizarTexto } from "./diagnostico";

export type Correspondencia = "Exata" | "Frase" | "Ampla";
export type OrigemDaSugestao = "regra" | "ia";

export interface SugestaoDeNegativa {
  termo: string;
  correspondencia: Correspondencia;
  grupoId: string;
  grupoNome: string;
  campanhaNome: string;
  custo: number;
  cliques: number;
  motivo: string;
  origem: OrigemDaSugestao;
}

export interface SugestaoDePalavraNova {
  texto: string;
  correspondencia: Correspondencia;
  grupoId: string | null;
  grupoNome: string;
  campanhaNome: string;
  conversoes: number;
  custo: number;
  motivo: string;
  origem: OrigemDaSugestao;
}

export const MAXIMO_DE_SUGESTOES = 100;

/**
 * F5.2 (regra) — termos que gastaram e não converteram nenhuma vez, do mais caro ao mais barato.
 * Fica de fora o que já é palavra-chave ou já está excluído. Negativa sugerida como Exata (a mais segura).
 */
export function sugerirNegativasPorRegra(termos: TermoDePesquisa[]): SugestaoDeNegativa[] {
  return termos
    .filter((t) => t.conversoes === 0 && t.custo > 0 && t.situacao === "NENHUMA")
    .sort((a, b) => b.custo - a.custo)
    .slice(0, MAXIMO_DE_SUGESTOES)
    .map((t) => ({
      termo: t.termo,
      correspondencia: "Exata" as const,
      grupoId: t.grupoId,
      grupoNome: t.grupoNome,
      campanhaNome: t.campanhaNome,
      custo: t.custo,
      cliques: t.cliques,
      motivo: `${t.cliques} clique(s) e nenhuma conversão no período.`,
      origem: "regra" as const,
    }));
}

function palavrasNormalizadasDoGrupo(palavrasPorGrupo: PalavrasPorGrupo, grupoId: string): Set<string> {
  return new Set((palavrasPorGrupo[grupoId] ?? []).map(normalizarTexto));
}

/**
 * F5.3 (regra) — termos que converteram e ainda não são palavra-chave no grupo.
 * 2+ conversões → Exata (comprovado); 1 conversão → Frase (dá alcance sem abrir demais).
 */
export function sugerirPalavrasNovasPorRegra(termos: TermoDePesquisa[], palavrasPorGrupo: PalavrasPorGrupo): SugestaoDePalavraNova[] {
  return termos
    .filter((t) => t.conversoes > 0 && t.situacao === "NENHUMA")
    .filter((t) => !palavrasNormalizadasDoGrupo(palavrasPorGrupo, t.grupoId).has(normalizarTexto(t.termo)))
    .sort((a, b) => b.conversoes - a.conversoes || a.custo - b.custo)
    .slice(0, MAXIMO_DE_SUGESTOES)
    .map((t) => ({
      texto: t.termo,
      correspondencia: t.conversoes >= 2 ? ("Exata" as const) : ("Frase" as const),
      grupoId: t.grupoId,
      grupoNome: t.grupoNome,
      campanhaNome: t.campanhaNome,
      conversoes: t.conversoes,
      custo: t.custo,
      motivo: `Converteu ${t.conversoes.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} vez(es) e ainda não é palavra-chave.`,
      origem: "regra" as const,
    }));
}

/** Total gasto em termos que não converteram (para o resumo da tela). */
export function somarGastoDeTermosSemConversao(termos: TermoDePesquisa[]): number {
  return termos.filter((t) => t.conversoes === 0).reduce((total, t) => total + t.custo, 0);
}
