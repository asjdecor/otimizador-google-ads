import type { ButtonHTMLAttributes } from "react";
import { classesBaseDoBotao } from "./classes-botao";

/** Botão neutro (design.md): Voltar, Copiar, Exportar CSV. */
export function BotaoVoltar({ className = "", type = "button", ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`${classesBaseDoBotao} border border-borda bg-superficie text-texto hover:bg-fundo ${className}`}
      {...resto}
    />
  );
}
