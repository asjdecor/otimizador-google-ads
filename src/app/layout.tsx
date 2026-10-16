import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { lerPeriodoDaRequisicao } from "@/api/http/periodo-da-requisicao";
import { lerConfiguracaoDoApp } from "@/api/servicos/configuracao";
import { obterEstadoDaConexao } from "@/api/servicos/conexao";
import { BotaoAtualizarDados } from "@/componentes/BotaoAtualizarDados";
import { MenuPrincipal } from "@/componentes/MenuPrincipal";
import { SeletorConta } from "@/componentes/SeletorConta";
import { SeletorPeriodo } from "@/componentes/SeletorPeriodo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Otimizador de Anúncios",
  description: "Analise e melhore seus anúncios do Google Ads",
};

export const dynamic = "force-dynamic";

export default async function LayoutRaiz({ children }: { children: ReactNode }) {
  const estado = await obterEstadoDaConexao();
  const periodo = await lerPeriodoDaRequisicao((await lerConfiguracaoDoApp()).periodoPadrao);
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen md:flex">
        <MenuPrincipal />
        <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borda bg-superficie px-4 py-3 md:px-8">
            {estado.conectado ? (
              <>
                <SeletorConta
                  contas={estado.contas.filter((c) => !c.ehGerente)}
                  selecionada={estado.contaSelecionada?.customerId ?? null}
                />
                <div className="flex flex-wrap items-center gap-3">
                  {estado.contaSelecionada && <SeletorPeriodo periodo={periodo} />}
                  {estado.contaSelecionada && <BotaoAtualizarDados />}
                  <Link href="/conectar" className="text-[13px] text-texto-suave hover:text-primaria hover:underline">
                    {estado.email}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <span className="text-texto-suave">Nenhuma conta conectada</span>
                <Link href="/conectar" className="font-bold text-primaria hover:underline">
                  Conectar Google Ads
                </Link>
              </>
            )}
          </header>
          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
