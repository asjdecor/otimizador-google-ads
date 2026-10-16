import { redirect } from "next/navigation";
import { caminhoDeVoltaSeguro, lerConfiguracaoDeLogin } from "@/api/seguranca/sessao";
import { Aviso } from "@/componentes/Aviso";
import { FormularioLogin } from "@/componentes/FormularioLogin";

export const dynamic = "force-dynamic";

/** Tela pública: não lê banco nem mostra nada da conta. */
export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ volta?: string }> }) {
  const { volta } = await searchParams;
  const config = lerConfiguracaoDeLogin();
  if (config.modo === "desligado") redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-card border border-borda bg-superficie p-6">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-extrabold text-primaria">Otimizador Ads</span>
          <h1>Entrar</h1>
        </div>
        {config.modo === "mal-configurado" ? (
          <Aviso tipo="erro">Login indisponível: {config.motivo}.</Aviso>
        ) : (
          <FormularioLogin volta={caminhoDeVoltaSeguro(volta)} />
        )}
      </div>
    </main>
  );
}
