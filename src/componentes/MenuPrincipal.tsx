"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { itemEstaAtivo, itensDoMenu } from "./itens-do-menu";

/** Menu lateral no desktop, barra inferior no celular. */
export function MenuPrincipal() {
  const rotaAtual = usePathname();
  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-borda bg-superficie md:static md:w-56 md:flex-col md:gap-1 md:border-t-0 md:border-r md:p-4"
    >
      <span className="hidden px-3 pb-4 text-lg font-extrabold text-primaria md:block">Otimizador Ads</span>
      {itensDoMenu.map((item) => {
        const ativo = itemEstaAtivo(item.href, rotaAtual);
        const cores = ativo
          ? "bg-primaria-clara font-bold text-primaria"
          : "text-texto-suave hover:bg-fundo hover:text-texto";
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-3 text-[13px] md:flex-none md:flex-row md:justify-start md:gap-3 md:text-[15px] ${cores}`}
          >
            <span aria-hidden="true">{item.icone}</span>
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
