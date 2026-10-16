import type { InputHTMLAttributes } from "react";

type PropsCampoTexto = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  rotulo: string;
  erro?: string;
};

/** Campo de texto com rótulo e os 4 estados do design.md (normal, hover, desabilitado, erro). */
export function CampoTexto({ id, rotulo, erro, className = "", ...resto }: PropsCampoTexto) {
  const idErro = erro ? `${id}-erro` : undefined;
  const borda = erro ? "border-erro" : "border-borda hover:border-texto-suave";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] leading-[18px] text-texto-suave">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idErro}
        className={`min-h-11 rounded-lg border bg-superficie px-3 outline-none transition-colors focus:border-2 focus:border-primaria disabled:bg-fundo disabled:text-texto-suave ${borda} ${className}`}
        {...resto}
      />
      {erro && (
        <span id={idErro} role="alert" className="text-[13px] leading-[18px] text-erro">
          {erro}
        </span>
      )}
    </div>
  );
}
