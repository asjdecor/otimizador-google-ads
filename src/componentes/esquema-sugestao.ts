import { z } from "zod";

/** Formato da sugestão que a rota /api/sugestoes devolve (validado também no navegador). */
export const esquemaSugestaoSalva = z.object({
  id: z.string(),
  criadoEm: z.string(),
  contextoUsuario: z.string().nullable(),
  titulos: z.array(z.string()),
  descricoes: z.array(z.string()),
  modelo: z.string(),
  custoEstimadoEmDolares: z.number().nullable(),
});

export type SugestaoParaTela = z.infer<typeof esquemaSugestaoSalva>;

export const esquemaRespostaDaGeracao = z.object({
  sugestao: esquemaSugestaoSalva,
  incompleto: z.boolean(),
});
