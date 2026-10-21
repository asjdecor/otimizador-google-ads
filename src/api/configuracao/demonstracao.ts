type Ambiente = Record<string, string | undefined>;

export const BANCO_DA_DEMONSTRACAO = "file:./demo.db";

/**
 * Modo de demonstração (Google e Claude falsos): só com APP_DADOS_FALSOS=1 e NUNCA em produção/Vercel,
 * para não haver jeito de um app publicado mostrar dados inventados.
 */
export function modoDemonstracaoAtivo(ambiente: Ambiente = process.env): boolean {
  return ambiente.APP_DADOS_FALSOS === "1" && ambiente.NODE_ENV !== "production" && !ambiente.VERCEL;
}

/**
 * Na demonstração, a IA é falsa por padrão (testes e `npm run demo` nunca gastam créditos).
 * Com APP_DEMO_IA_REAL=1 (`npm run demo:ia-real`), os dados continuam de exemplo, mas o Claude é o de verdade.
 */
export function usarIaReal(ambiente: Ambiente = process.env): boolean {
  return !modoDemonstracaoAtivo(ambiente) || ambiente.APP_DEMO_IA_REAL === "1";
}

/** Na demonstração, nunca grava no banco real (dados.db): troca para demo.db. Null = usar DATABASE_URL. */
export function urlDoBancoParaOAmbiente(ambiente: Ambiente = process.env): string | null {
  if (modoDemonstracaoAtivo(ambiente) && (ambiente.DATABASE_URL ?? "").includes("dados.db")) return BANCO_DA_DEMONSTRACAO;
  return null;
}
