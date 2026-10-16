type Destaque = "normal" | "erro" | "apoio";

const coresDoValor: Record<Destaque, string> = {
  normal: "text-texto",
  erro: "text-erro",
  apoio: "text-apoio",
};

/** KPI do design.md: rótulo + valor grande. Sem dados mostra "—"; com erro mostra "!". */
export function CardMetrica({
  rotulo,
  valor,
  legenda,
  destaque = "normal",
  erro = false,
}: {
  rotulo: string;
  valor: string | null;
  legenda?: string;
  destaque?: Destaque;
  erro?: boolean;
}) {
  const semDados = valor === null || valor === "—";
  return (
    <div
      className={`flex flex-col gap-1 rounded-card border bg-superficie p-4 transition-shadow hover:shadow-md ${
        destaque === "erro" && !semDados ? "border-erro" : "border-borda"
      }`}
    >
      <span className="text-[13px] leading-[18px] text-texto-suave">{rotulo}</span>
      {erro ? (
        <>
          <span className="numero text-[32px] leading-10 text-erro">!</span>
          <span className="text-[13px] text-erro">Não foi possível carregar</span>
        </>
      ) : (
        <>
          <span className={`numero text-[32px] leading-10 ${semDados ? "text-texto-suave" : coresDoValor[destaque]}`}>
            {semDados ? "—" : valor}
          </span>
          {legenda && <span className="text-[13px] leading-[18px] text-texto-suave">{legenda}</span>}
        </>
      )}
    </div>
  );
}
