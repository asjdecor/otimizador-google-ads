import type { ButtonHTMLAttributes } from "react";
import { classesBaseDoBotao } from "./classes-botao";

/** Botão de erro (design.md): Desconectar conta, Cancelar. */
export function BotaoCancelar({ className = "", type = "button", ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`${classesBaseDoBotao} border border-erro bg-superficie text-erro hover:bg-erro hover:text-white ${className}`}
      {...resto}
    />
  );
}
