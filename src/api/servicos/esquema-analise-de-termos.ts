import { z } from "zod";

// Módulo puro (sem banco): usado no servidor e no navegador para validar a análise de termos.

const correspondencia = z.enum(["Exata", "Frase", "Ampla"]);
const origem = z.enum(["regra", "ia"]);

export const esquemaNegativa = z.object({
  termo: z.string(),
  correspondencia,
  grupoId: z.string(),
  grupoNome: z.string(),
  campanhaNome: z.string(),
  custo: z.number(),
  cliques: z.number(),
  motivo: z.string(),
  origem,
});

export const esquemaPalavraNova = z.object({
  texto: z.string(),
  correspondencia,
  grupoId: z.string().nullable(),
  grupoNome: z.string(),
  campanhaNome: z.string(),
  conversoes: z.number(),
  custo: z.number(),
  motivo: z.string(),
  origem,
});

/** O que fica guardado em Sugestao.resultadoJson. */
export const esquemaConteudoDaAnalise = z.object({
  negativas: z.array(esquemaNegativa),
  novas: z.array(esquemaPalavraNova),
});

/** O que a rota /api/termos/analisar devolve e a tela mostra. */
export const esquemaAnaliseSalva = esquemaConteudoDaAnalise.extend({
  id: z.string(),
  criadoEm: z.string(),
  contextoUsuario: z.string().nullable(),
  modelo: z.string(),
  custoEstimadoEmDolares: z.number().nullable(),
});

export type AnaliseSalva = z.infer<typeof esquemaAnaliseSalva>;
