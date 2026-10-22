import { redirect } from "next/navigation";
import { caminhoDeVoltaSeguro, lerConfiguracaoDeLogin } from "@/api/seguranca/sessao";
import { Aviso } from "@/componentes/Aviso";
import { FormularioLogin } from "@/componentes/FormularioLogin";
import { classesBaseDoBotao } from "@/componentes/classes-botao";

export const dynamic = "force-dynamic";

/** Tela pública: não lê banco nem mostra nada da conta. */
export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ volta?: string; erro?: string }> }) {
  const { volta, erro } = await searchParams;
  const config = lerConfiguracaoDeLogin();
  if (config.modo === "desligado") redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-card border border-borda bg-superficie p-6">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-extrabold text-primaria">Otimizador Ads</span>
          <h1>{config.modo === "google" ? "Entrar com Google" : "Entrar"}</h1>
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {config.modo === "mal-configurado" ? (
          <Aviso tipo="erro">Login indisponível: {config.motivo}.</Aviso>
        ) : config.modo === "google" ? (
          <div className="flex flex-col gap-4">
            <p className="text-texto-suave">
              Entre com <strong>{config.emailAutorizado}</strong> e autorize a conexão com o Google Ads. O app consulta
              campanhas e métricas para montar sua análise; não cria nem altera anúncios, campanhas ou orçamento.
            </p>
            <a href="/api/auth/google" className={`${classesBaseDoBotao} w-full bg-primaria text-center text-white hover:bg-primaria-escura`}>
              Continuar com Google
            </a>
            <p className="text-xs text-texto-suave">
              O Google mostrará as permissões antes de continuar. Você pode revogar o acesso nas configurações da sua conta Google.
            </p>
          </div>
        ) : (
          <FormularioLogin volta={caminhoDeVoltaSeguro(volta || "/painel")} />
        )}
      </div>
    </main>
  );
}
