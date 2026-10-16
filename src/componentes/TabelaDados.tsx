"use client";

import Link from "next/link";
import { useState } from "react";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/api/servicos/formatacao";
import { ordenarLinhas, type DirecaoDaOrdem, type LinhaDaTabela, type ValorDaCelula } from "./ordenar-linhas";

export interface ColunaDaTabela {
  chave: string;
  titulo: string;
  formato: "texto" | "numero" | "moeda" | "percentual";
}

function formatarCelula(valor: ValorDaCelula, formato: ColunaDaTabela["formato"], moeda: string): string {
  if (formato === "texto") return valor === null ? "—" : String(valor);
  const numero = typeof valor === "number" ? valor : null;
  if (formato === "moeda") return formatarMoeda(numero, moeda);
  if (formato === "percentual") return formatarPercentual(numero);
  return formatarNumero(numero);
}

/**
 * Tabela do design.md: cabeçalho clicável para ordenar, números à direita,
 * linhas alternadas, linha de destaque com borda vermelha e rolagem horizontal no celular.
 * Linhas com `destaque: 1` recebem a borda de desperdício.
 * Com `colunaComLink`, essa coluna vira link para o `href` da linha.
 */
export function TabelaDados({
  titulo,
  colunas,
  linhas,
  moeda = "BRL",
  ordemInicial,
  mensagemVazia = "Nada encontrado neste período",
  colunaComLink,
}: {
  titulo: string;
  colunas: ColunaDaTabela[];
  linhas: LinhaDaTabela[];
  moeda?: string;
  ordemInicial?: { coluna: string; direcao: DirecaoDaOrdem };
  mensagemVazia?: string;
  colunaComLink?: string;
}) {
  const [ordem, setOrdem] = useState(ordemInicial ?? null);
  const visiveis = ordem ? ordenarLinhas(linhas, ordem.coluna, ordem.direcao) : linhas;

  function ordenarPor(coluna: ColunaDaTabela) {
    setOrdem((atual) =>
      atual?.coluna === coluna.chave
        ? { coluna: coluna.chave, direcao: atual.direcao === "asc" ? "desc" : "asc" }
        : { coluna: coluna.chave, direcao: coluna.formato === "texto" ? "asc" : "desc" },
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-borda bg-superficie">
      <table className="w-full min-w-[640px] text-left">
        <caption className="sr-only">{titulo}</caption>
        <thead className="sticky top-0 bg-superficie text-[13px] text-texto-suave">
          <tr>
            {colunas.map((coluna) => {
              const ativa = ordem?.coluna === coluna.chave;
              const direcaoAria = ativa ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none";
              return (
                <th
                  key={coluna.chave}
                  scope="col"
                  aria-sort={direcaoAria}
                  className={`px-4 py-2 font-medium ${coluna.formato === "texto" ? "" : "text-right"}`}
                >
                  <button
                    type="button"
                    onClick={() => ordenarPor(coluna)}
                    className={`inline-flex min-h-11 items-center gap-1 hover:text-texto ${ativa ? "font-bold text-texto" : ""}`}
                  >
                    {coluna.titulo}
                    <span aria-hidden="true">{ativa ? (ordem.direcao === "asc" ? "▲" : "▼") : "↕"}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visiveis.map((linha) => (
            <tr
              key={linha.chave}
              className={`border-t border-borda odd:bg-superficie even:bg-fundo hover:bg-primaria-clara ${
                linha.destaque === 1 ? "border-l-4 border-l-erro" : ""
              }`}
            >
              {colunas.map((coluna) => (
                <td
                  key={coluna.chave}
                  className={`px-4 py-2 ${coluna.formato === "texto" ? "" : "numero text-right font-medium"}`}
                >
                  {coluna.chave === colunaComLink && typeof linha.href === "string" ? (
                    <Link href={linha.href} className="font-bold text-primaria hover:underline">
                      {formatarCelula(linha[coluna.chave] ?? null, coluna.formato, moeda)}
                    </Link>
                  ) : (
                    formatarCelula(linha[coluna.chave] ?? null, coluna.formato, moeda)
                  )}
                </td>
              ))}
            </tr>
          ))}
          {visiveis.length === 0 && (
            <tr>
              <td colSpan={colunas.length} className="px-4 py-8 text-center text-texto-suave">
                {mensagemVazia}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
