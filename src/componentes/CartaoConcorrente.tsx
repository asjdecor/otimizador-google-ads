import type { RelatorioDeConcorrente } from "@/api/servicos/esquema-pesquisa-de-mercado";

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <h4 className="text-[13px] font-bold text-texto-suave">{titulo}</h4>
      <ul className="list-disc pl-5">
        {itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const ehLinkWeb = (fonte: string) => /^https?:\/\//i.test(fonte);

/** O que um concorrente mostra ao público: o que vende, promessas, preços, diferenciais, pontos fracos e as fontes lidas. */
export function CartaoConcorrente({ relatorio }: { relatorio: RelatorioDeConcorrente }) {
  return (
    <article className="flex flex-col gap-3 rounded-card border border-borda bg-superficie p-4">
      <h3 className="font-extrabold">{relatorio.dominio}</h3>
      {!relatorio.lido ? (
        <p className="text-texto-suave">Não foi possível ler o site.</p>
      ) : (
        <>
          {relatorio.oQueVende && <p>{relatorio.oQueVende}</p>}
          <Lista titulo="Promessas" itens={relatorio.promessas} />
          <Lista titulo="Preços" itens={relatorio.precos} />
          <Lista titulo="Diferenciais" itens={relatorio.diferenciais} />
          <Lista titulo="Pontos fracos" itens={relatorio.pontosFracos} />
        </>
      )}
      {relatorio.fontes.length > 0 && (
        <div>
          <h4 className="text-[13px] font-bold text-texto-suave">Fontes</h4>
          <ul className="flex flex-col gap-1 text-[13px]">
            {relatorio.fontes.map((fonte) => (
              <li key={fonte} className="break-all">
                {ehLinkWeb(fonte) ? (
                  <a href={fonte} target="_blank" rel="noopener noreferrer" className="text-primaria hover:underline">
                    {fonte}
                  </a>
                ) : (
                  fonte
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
