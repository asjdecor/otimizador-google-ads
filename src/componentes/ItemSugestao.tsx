"use client";

import { useState } from "react";
import { contarCaracteresVisiveis } from "@/api/servicos/diagnostico";
import { copiarTexto } from "./copiar-texto";

/** Texto gerado pela IA + contador (27/30) + copiar (design.md). */
export function ItemSugestao({ texto, limite }: { texto: string; limite: number }) {
  const [estado, setEstado] = useState<"normal" | "copiado" | "falhou">("normal");
  const tamanho = contarCaracteresVisiveis(texto);
  const passou = tamanho > limite;

  async function copiar() {
    setEstado((await copiarTexto(texto)) ? "copiado" : "falhou");
    window.setTimeout(() => setEstado("normal"), 2000);
  }

  return (
    <li className="group flex items-center gap-3 border-t border-borda py-2 first:border-t-0">
      <span className="min-w-0 flex-1 break-words">{texto}</span>
      <span className={`numero shrink-0 text-[13px] ${passou ? "text-erro" : "text-texto-suave"}`} title="Caracteres">
        {tamanho}/{limite}
      </span>
      <button
        type="button"
        onClick={() => void copiar()}
        className={`min-h-11 shrink-0 rounded-lg px-3 text-[13px] font-bold transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 ${
          estado === "copiado" ? "text-apoio md:opacity-100" : estado === "falhou" ? "text-erro md:opacity-100" : "text-primaria hover:bg-primaria-clara"
        }`}
      >
        {estado === "copiado" ? "Copiado ✓" : estado === "falhou" ? "Não copiou" : "Copiar"}
      </button>
    </li>
  );
}
