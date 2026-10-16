import type { ItemDoDiagnostico } from "@/api/servicos/diagnostico";

const icones = {
  erro: { simbolo: "✕", classe: "text-erro", rotulo: "Problema" },
  aviso: { simbolo: "!", classe: "bg-aviso text-texto", rotulo: "Atenção" },
  ok: { simbolo: "✓", classe: "text-apoio", rotulo: "Ok" },
} as const;

/** Ícone + problema + como corrigir (design.md). */
export function ItemDiagnostico({ item }: { item: ItemDoDiagnostico }) {
  const icone = icones[item.situacao];
  return (
    <li className="flex gap-3 border-t border-borda py-3 first:border-t-0">
      <span
        aria-label={icone.rotulo}
        className={`numero inline-flex size-6 shrink-0 items-center justify-center rounded-full ${icone.classe}`}
      >
        {icone.simbolo}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={item.situacao === "ok" ? "text-texto-suave" : ""}>{item.problema}</span>
        {item.comoCorrigir && (
          <span className="text-[13px] leading-[18px] text-texto-suave">
            <strong className="text-texto">Como corrigir:</strong> {item.comoCorrigir}
          </span>
        )}
      </div>
      {item.pontosPerdidos > 0 && (
        <span className="numero shrink-0 text-[13px] text-erro" title="Pontos perdidos na nota">
          −{item.pontosPerdidos}
        </span>
      )}
    </li>
  );
}
