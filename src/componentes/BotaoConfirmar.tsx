import type { ButtonHTMLAttributes } from "react";
import { classesBaseDoBotao } from "./classes-botao";

type PropsBotaoConfirmar = ButtonHTMLAttributes<HTMLButtonElement> & {
  carregando?: boolean;
  textoCarregando?: string;
  erro?: string;
};

/** Botão primário (design.md): Gerar sugestões, Conectar, Salvar. */
export function BotaoConfirmar({
  carregando = false,
  textoCarregando = "Carregando…",
  erro,
  disabled,
  children,
  className = "",
  type = "button",
  ...resto
}: PropsBotaoConfirmar) {
  const idErro = erro ? `${resto.id ?? "botao"}-erro` : undefined;
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type={type}
        disabled={disabled || carregando}
        aria-busy={carregando || undefined}
        aria-describedby={idErro}
        className={`${classesBaseDoBotao} bg-primaria text-white hover:bg-primaria-escura ${
          erro ? "ring-2 ring-erro" : ""
        } ${className}`}
        {...resto}
      >
        {carregando && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
        )}
        {carregando ? textoCarregando : children}
      </button>
      {erro && (
        <span id={idErro} role="alert" className="text-[13px] leading-[18px] text-erro">
          {erro}
        </span>
      )}
    </span>
  );
}
