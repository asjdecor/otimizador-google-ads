import type { MetricasDeAnuncio, MetricasDePalavraChave } from "@/api/integracoes/google-ads/metricas";

export function palavra(parcial: Partial<MetricasDePalavraChave> = {}): MetricasDePalavraChave {
  return {
    criterioId: "1",
    texto: "sofá retrátil",
    correspondencia: "Frase",
    grupoId: "g1",
    grupoNome: "Sofás",
    campanhaNome: "Pesquisa",
    impressoes: 1000,
    cliques: 50,
    custo: 10,
    conversoes: 0,
    ...parcial,
  };
}

export function anuncio(parcial: Partial<MetricasDeAnuncio> = {}): MetricasDeAnuncio {
  return {
    anuncioId: "a1",
    titulo: "Sofás sob medida",
    grupoId: "g1",
    grupoNome: "Sofás",
    campanhaNome: "Pesquisa",
    impressoes: 1000,
    cliques: 50,
    custo: 10,
    conversoes: 1,
    ...parcial,
  };
}
