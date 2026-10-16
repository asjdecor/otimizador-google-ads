"use client";

import { useState } from "react";
import { LIMITE_DESCRICAO, LIMITE_TITULO } from "@/api/servicos/diagnostico";
import { BotaoVoltar } from "./BotaoVoltar";
import { copiarTexto } from "./copiar-texto";
import { ItemSugestao } from "./ItemSugestao";

function BlocoDeTextos({ titulo, textos, limite }: { titulo: string; textos: string[]; limite: number }) {
  const [copiados, setCopiados] = useState(false);

  async function copiarTodos() {
    if (await copiarTexto(textos.join("\n"))) {
      setCopiados(true);
      window.setTimeout(() => setCopiados(false), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-borda bg-superficie p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-extrabold">
          {titulo} <span className="font-medium text-texto-suave">({textos.length})</span>
        </h3>
        <BotaoVoltar onClick={() => void copiarTodos()} disabled={textos.length === 0}>
          {copiados ? "Copiados ✓" : "Copiar todos"}
        </BotaoVoltar>
      </div>
      <ul>
        {textos.map((texto) => (
          <ItemSugestao key={texto} texto={texto} limite={limite} />
        ))}
      </ul>
    </div>
  );
}

/** Títulos e descrições de uma geração, lado a lado no desktop. */
export function ListaDeSugestoes({ titulos, descricoes }: { titulos: string[]; descricoes: string[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BlocoDeTextos titulo="Títulos sugeridos" textos={titulos} limite={LIMITE_TITULO} />
      <BlocoDeTextos titulo="Descrições sugeridas" textos={descricoes} limite={LIMITE_DESCRICAO} />
    </div>
  );
}
