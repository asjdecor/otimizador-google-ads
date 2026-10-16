export type ValorDaCelula = string | number | null;
export type LinhaDaTabela = Record<string, ValorDaCelula> & { chave: string };
export type DirecaoDaOrdem = "asc" | "desc";

/** Ordena por uma coluna. Vazios (null) sempre vão para o fim; texto usa ordem do português. */
export function ordenarLinhas(linhas: LinhaDaTabela[], coluna: string, direcao: DirecaoDaOrdem): LinhaDaTabela[] {
  const sinal = direcao === "asc" ? 1 : -1;
  return [...linhas].sort((a, b) => {
    const va = a[coluna] ?? null;
    const vb = b[coluna] ?? null;
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * sinal;
    return String(va).localeCompare(String(vb), "pt-BR") * sinal;
  });
}
