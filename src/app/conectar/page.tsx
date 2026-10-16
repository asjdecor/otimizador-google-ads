import { listarCamposGoogleFaltando } from "@/api/configuracao/ambiente";
import { formatarIdDaConta } from "@/api/servicos/formatacao";
import { obterEstadoDaConexao } from "@/api/servicos/conexao";
import { AcoesDaConexao } from "@/componentes/AcoesDaConexao";
import { Aviso } from "@/componentes/Aviso";
import { classesBaseDoBotao } from "@/componentes/classes-botao";

export const dynamic = "force-dynamic";

interface PropsPagina {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}

export default async function PaginaConectar({ searchParams }: PropsPagina) {
  const { erro, ok } = await searchParams;
  const estado = await obterEstadoDaConexao();
  const camposFaltando = listarCamposGoogleFaltando();

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <h1>Conectar Google Ads</h1>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {ok && estado.conectado && <Aviso tipo="sucesso">Conta Google conectada.</Aviso>}

      {!estado.conectado && (
        <div className="flex flex-col gap-4 rounded-card border border-borda bg-superficie p-6">
          <p>
            Conecte sua conta Google para o app <strong>ler</strong> campanhas, anúncios e palavras-chave. Nada é
            alterado no Google Ads.
          </p>
          {camposFaltando.length > 0 ? (
            <>
              <Aviso tipo="aviso">
                Antes de conectar, preencha no arquivo <code>.env</code>: {camposFaltando.join(", ")}. Depois reinicie o
                app.
              </Aviso>
              <span aria-disabled="true" className={`${classesBaseDoBotao} w-fit bg-primaria text-white opacity-40`}>
                Conectar com Google
              </span>
            </>
          ) : (
            <a href="/api/auth/google" className={`${classesBaseDoBotao} w-fit bg-primaria text-white hover:bg-primaria-escura`}>
              Conectar com Google
            </a>
          )}
        </div>
      )}

      {estado.conectado && (
        <div className="flex flex-col gap-4 rounded-card border border-borda bg-superficie p-6">
          <p>
            Conectado como <strong>{estado.email}</strong>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Contas acessíveis</caption>
              <thead className="text-[13px] text-texto-suave">
                <tr>
                  <th className="py-2 pr-4 font-medium">Conta</th>
                  <th className="py-2 pr-4 font-medium">ID</th>
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 font-medium">Moeda</th>
                </tr>
              </thead>
              <tbody>
                {estado.contas.map((conta) => (
                  <tr key={conta.customerId} className="border-t border-borda">
                    <td className="py-2 pr-4">
                      {conta.nome}
                      {conta.selecionada && (
                        <span className="ml-2 rounded bg-primaria-clara px-2 py-0.5 text-[13px] font-bold text-primaria">
                          em análise
                        </span>
                      )}
                    </td>
                    <td className="numero py-2 pr-4">{formatarIdDaConta(conta.customerId)}</td>
                    <td className="py-2 pr-4">{conta.ehGerente ? "Gerente (MCC)" : "Anúncios"}</td>
                    <td className="py-2">{conta.moeda}</td>
                  </tr>
                ))}
                {estado.contas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-texto-suave">
                      Nenhuma conta encontrada para este login.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AcoesDaConexao />
        </div>
      )}
    </section>
  );
}
