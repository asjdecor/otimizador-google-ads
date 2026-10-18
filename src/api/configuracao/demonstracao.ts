type Ambiente = Record<string, string | undefined>;

export const BANCO_DA_DEMONSTRACAO = "file:./demo.db";

/**
 * Modo de demonstração (Google e Claude falsos): só com APP_DADOS_FALSOS=1 e NUNCA em produção/Vercel,
 * para não haver jeito de um app publicado mostrar dados inventados.
 */
export function modoDemonstracaoAtivo(ambiente: Ambiente = process.env): boolean {
  return ambiente.APP_DADOS_FALSOS === "1" && ambiente.NODE_ENV !== "production" && !ambiente.VERCEL;
}

/** Na demonstração, nunca grava no banco real (dados.db): troca para demo.db. Null = usar DATABASE_URL. */
export function urlDoBancoParaOAmbiente(ambiente: Ambiente = process.env): string | null {
  if (modoDemonstracaoAtivo(ambiente) && (ambiente.DATABASE_URL ?? "").includes("dados.db")) return BANCO_DA_DEMONSTRACAO;
  return null;
}
