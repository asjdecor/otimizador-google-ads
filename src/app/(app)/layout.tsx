import Link from "next/link";
import type { ReactNode } from "react";
import { lerPeriodoDaRequisicao } from "@/api/http/periodo-da-requisicao";
import { lerConfiguracaoDoApp } from "@/api/servicos/configuracao";
import { obterEstadoDaConexao } from "@/api/servicos/conexao";
import { lerConfiguracaoDeLogin } from "@/api/seguranca/sessao";
import { BotaoAtualizarDados } from "@/componentes/BotaoAtualizarDados";
import { BotaoSair } from "@/componentes/BotaoSair";
import { MenuPrincipal } from "@/componentes/MenuPrincipal";
import { SeletorConta } from "@/componentes/SeletorConta";
import { SeletorPeriodo } from "@/componentes/SeletorPeriodo";

export const dynamic = "force-dynamic";

/** Layout das telas do app (protegidas pelo middleware): menu + topo com conta e período. */
export default async function LayoutDoApp({ children }: { children: ReactNode }) {
  const estado = await obterEstadoDaConexao();
  const periodo = await lerPeriodoDaRequisicao((await lerConfiguracaoDoApp()).periodoPadrao);
  const loginAtivo = lerConfiguracaoDeLogin().modo === "ativo";
  return (
    <div className="min-h-screen md:flex">
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
                {loginAtivo && <BotaoSair />}
              </div>
            </>
          ) : (
            <>
              <span className="text-texto-suave">Nenhuma conta conectada</span>
              <div className="flex items-center gap-3">
                <Link href="/conectar" className="font-bold text-primaria hover:underline">
                  Conectar Google Ads
                </Link>
                {loginAtivo && <BotaoSair />}
              </div>
            </>
          )}
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
