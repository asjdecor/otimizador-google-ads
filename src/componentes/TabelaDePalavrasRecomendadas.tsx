"use client";

import { useState } from "react";
import { montarCsvDeRecomendadas } from "@/api/servicos/csv";
import type { NegativaSugerida, PalavraRecomendada } from "@/api/servicos/esquema-pesquisa-de-mercado";
import { formatarMoeda, formatarNumero } from "@/api/servicos/formatacao";
import { BotaoExportarCsv } from "./BotaoExportarCsv";

const NOMES_CONCORRENCIA = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", SEM_DADOS: "—" } as const;

function faixaDeLance(p: PalavraRecomendada, moeda: string): string {
  if (p.lanceBaixo === null && p.lanceAlto === null) return "—";
  return `${formatarMoeda(p.lanceBaixo, moeda)} a ${formatarMoeda(p.lanceAlto, moeda)}`;
}

function alternar(atual: ReadonlySet<number>, indice: number): ReadonlySet<number> {
  const novo = new Set(atual);
  if (novo.has(indice)) novo.delete(indice);
  else novo.add(indice);
  return novo;
}

/** Palavras e negativas recomendadas: marque as que quer e exporte no formato do Google Ads Editor. */
export function TabelaDePalavrasRecomendadas({
  palavras,
  negativas,
  moeda,
}: {
  palavras: PalavraRecomendada[];
  negativas: NegativaSugerida[];
  moeda: string;
}) {
  const [palavrasDesmarcadas, setPalavrasDesmarcadas] = useState<ReadonlySet<number>>(new Set());
  const [negativasDesmarcadas, setNegativasDesmarcadas] = useState<ReadonlySet<number>>(new Set());

  const palavrasMarcadas = palavras.filter((_, i) => !palavrasDesmarcadas.has(i));
  const negativasMarcadas = negativas.filter((_, i) => !negativasDesmarcadas.has(i));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <BotaoExportarCsv
          conteudo={montarCsvDeRecomendadas(palavrasMarcadas, negativasMarcadas)}
          nomeDoArquivo="pesquisa-de-mercado.csv"
          quantidade={palavrasMarcadas.length + negativasMarcadas.length}
        />
      </div>

      <div className="overflow-x-auto rounded-card border border-borda bg-superficie">
        <table className="w-full min-w-[720px] text-left">
          <caption className="sr-only">Palavras-chave recomendadas</caption>
          <thead className="text-[13px] text-texto-suave">
            <tr>
              <th className="px-4 py-2 font-medium">Usar</th>
              <th className="px-4 py-2 font-medium">Palavra-chave</th>
              <th className="px-4 py-2 font-medium">Corresp.</th>
              <th className="px-4 py-2 text-right font-medium">Buscas/mês</th>
              <th className="px-4 py-2 font-medium">Concorrência</th>
              <th className="px-4 py-2 font-medium">Lance (faixa)</th>
              <th className="px-4 py-2 font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {palavras.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-texto-suave">
                  Nenhuma palavra recomendada.
                </td>
              </tr>
            )}
            {palavras.map((p, i) => (
              <tr key={`${p.texto}-${p.correspondencia}`} className="border-t border-borda">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Usar ${p.texto}`}
                    className="size-5"
                    checked={!palavrasDesmarcadas.has(i)}
                    onChange={() => setPalavrasDesmarcadas((atual) => alternar(atual, i))}
                  />
                </td>
                <td className="px-4 py-2 font-bold">{p.texto}</td>
                <td className="px-4 py-2">{p.correspondencia}</td>
                <td className="numero px-4 py-2 text-right">
                  {p.volumeMensal === null ? <span className="text-texto-suave">Sem volume</span> : formatarNumero(p.volumeMensal)}
                </td>
                <td className="px-4 py-2">{NOMES_CONCORRENCIA[p.concorrencia]}</td>
                <td className="numero px-4 py-2">{faixaDeLance(p, moeda)}</td>
                <td className="px-4 py-2">{p.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {negativas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-extrabold">Negativas sugeridas</h3>
          <ul className="flex flex-col gap-1 rounded-card border border-borda bg-superficie p-4">
            {negativas.map((n, i) => (
              <li key={n.termo}>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={!negativasDesmarcadas.has(i)}
                    onChange={() => setNegativasDesmarcadas((atual) => alternar(atual, i))}
                  />
                  <span>
                    <strong>{n.termo}</strong> (negativa exata) · {n.motivo}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
