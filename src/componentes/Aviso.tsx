import type { ReactNode } from "react";

const estilos = {
  erro: { caixa: "border-erro bg-erro/10", icone: "✕", corIcone: "text-erro" },
  aviso: { caixa: "border-aviso bg-aviso/30", icone: "!", corIcone: "text-texto" },
  sucesso: { caixa: "border-apoio bg-apoio/10", icone: "✓", corIcone: "text-apoio" },
} as const;

/** Faixa de mensagem. Cor nunca é o único sinal: sempre tem ícone + texto (design.md). */
export function Aviso({ tipo, children }: { tipo: keyof typeof estilos; children: ReactNode }) {
  const estilo = estilos[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`flex gap-3 rounded-card border p-4 ${estilo.caixa}`}>
      <span aria-hidden="true" className={`font-extrabold ${estilo.corIcone}`}>
        {estilo.icone}
      </span>
      <div>{children}</div>
    </div>
  );
}
