import type { TermoDePesquisa } from "@/api/integracoes/google-ads/termos";

export function termo(parcial: Partial<TermoDePesquisa> = {}): TermoDePesquisa {
  return {
    termo: "sofá retrátil",
    situacao: "NENHUMA",
    grupoId: "10",
    grupoNome: "Sofás",
    campanhaNome: "Pesquisa",
    impressoes: 100,
    cliques: 5,
    custo: 10,
    conversoes: 0,
    ...parcial,
  };
}
