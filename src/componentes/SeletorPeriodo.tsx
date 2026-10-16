"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { COOKIE_PERIODO, PERIODOS_DISPONIVEIS, type Periodo } from "@/api/servicos/periodo";

/** Botões 7/30/90 dias. O período vai num cookie para todas as telas usarem o mesmo. */
export function SeletorPeriodo({ periodo }: { periodo: Periodo }) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();

  function escolher(novo: Periodo) {
    document.cookie = `${COOKIE_PERIODO}=${novo}; path=/; max-age=31536000; samesite=lax`;
    iniciarTransicao(() => router.refresh());
  }

  return (
    <div role="group" aria-label="Período" className="inline-flex rounded-lg border border-borda bg-superficie p-0.5">
      {PERIODOS_DISPONIVEIS.map((opcao) => {
        const ativo = opcao === periodo;
        return (
          <button
            key={opcao}
            type="button"
            aria-pressed={ativo}
            disabled={pendente}
            onClick={() => escolher(opcao)}
            className={`min-h-10 min-w-11 rounded-md px-3 text-[13px] font-bold transition-colors disabled:opacity-40 ${
              ativo ? "bg-primaria text-white" : "text-texto-suave hover:bg-fundo hover:text-texto"
            }`}
          >
            {opcao} dias
          </button>
        );
      })}
    </div>
  );
}
