import type { Correspondencia, SugestaoDeNegativa, SugestaoDePalavraNova } from "./termos";

/**
 * Célula CSV segura: aspas quando preciso e proteção contra "injeção de fórmula"
 * (termos de pesquisa vêm de qualquer pessoa na internet; "=HYPERLINK(...)" não pode virar fórmula no Excel).
 */
export function escaparCelulaCsv(valor: string | number): string {
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV com BOM (o Excel abre acentos certo) e quebras \r\n. */
export function montarCsv(cabecalho: string[], linhas: (string | number)[][]): string {
  return "﻿" + [cabecalho, ...linhas].map((linha) => linha.map(escaparCelulaCsv).join(",")).join("\r\n");
}

const TIPO_NEGATIVA: Record<Correspondencia, string> = {
  Exata: "Negative exact",
  Frase: "Negative phrase",
  Ampla: "Negative broad",
};
const TIPO_POSITIVA: Record<Correspondencia, string> = { Exata: "Exact", Frase: "Phrase", Ampla: "Broad" };

/** F5.4 — formato que o Google Ads Editor importa (Campaign, Ad group, Keyword, Criterion Type). */
export function montarCsvDeNegativas(negativas: SugestaoDeNegativa[]): string {
  return montarCsv(
    ["Campaign", "Ad group", "Keyword", "Criterion Type"],
    negativas.map((n) => [n.campanhaNome, n.grupoNome, n.termo, TIPO_NEGATIVA[n.correspondencia]]),
  );
}

export function montarCsvDePalavrasNovas(palavras: SugestaoDePalavraNova[]): string {
  return montarCsv(
    ["Campaign", "Ad group", "Keyword", "Criterion Type"],
    palavras.map((p) => [p.campanhaNome, p.grupoNome, p.texto, TIPO_POSITIVA[p.correspondencia]]),
  );
}
