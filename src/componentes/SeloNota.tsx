import { classificarNota } from "@/api/servicos/diagnostico";

const estilos = {
  Boa: "bg-apoio text-white",
  Média: "bg-aviso text-texto",
  Ruim: "bg-erro text-white",
} as const;

/** Nota 0–100 em círculo + rótulo (design.md). Cor nunca é o único sinal: o rótulo sempre aparece. */
export function SeloNota({ nota, tamanho = "normal" }: { nota: number | null; tamanho?: "normal" | "grande" }) {
  const dimensao = tamanho === "grande" ? "size-20 text-[32px]" : "size-11 text-[15px]";
  if (nota === null) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className={`numero inline-flex items-center justify-center rounded-full bg-borda text-texto-suave ${dimensao}`}>—</span>
        <span className="text-texto-suave">Sem dados</span>
      </span>
    );
  }
  const classificacao = classificarNota(nota);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`numero inline-flex items-center justify-center rounded-full ${estilos[classificacao]} ${dimensao}`}
        aria-label={`Nota ${nota} de 100`}
      >
        {nota}
      </span>
      <span className="font-bold">{classificacao}</span>
    </span>
  );
}
