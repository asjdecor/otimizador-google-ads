import { z } from "zod";

export const AGENTES_ANALISE_PREMIUM = [
  "pesquisa_palavras",
  "intencao_busca",
  "concorrencia",
  "qualidade_pagina",
  "score_custo",
  "segmentacao_geo",
  "match_type",
  "negativas",
  "riscos_politica",
  "correcao_acao",
] as const;

export const esquemaRespostaPremium = z.object({
  resumo: z.string(),
  scoreTotal: z.number().min(0).max(100),
  agentes: z.array(
    z.object({
      agente: z.enum(AGENTES_ANALISE_PREMIUM),
      score: z.number().min(0).max(100).nullable(),
      prioridade: z.enum(["alta", "media", "baixa"]),
      observacoes: z.array(z.string()),
      recomendacoes: z.array(z.string()),
    }),
  ),
  correcoes: z.array(
    z.object({
      agente: z.enum(AGENTES_ANALISE_PREMIUM),
      titulo: z.string(),
      descricao: z.string(),
      prioridade: z.enum(["alta", "media", "baixa"]),
      impacto: z.string(),
      acao: z.array(z.string()),
    }),
  ),
  palavrasPriorizadas: z.array(z.string()),
  riscos: z.array(z.string()),
});

export const esquemaResultadoAnalisePremium = esquemaRespostaPremium.extend({
  provedores: z.array(z.object({ nome: z.enum(["Claude", "OpenAI"]), modelo: z.string() })),
  avisos: z.array(z.string()),
  criadoEm: z.string(),
  custoEstimadoEmDolares: z.number().nullable(),
});

export type DadosAnalisePremium = z.infer<typeof esquemaRespostaPremium>;
export type ResultadoAnalisePremium = z.infer<typeof esquemaResultadoAnalisePremium>;
