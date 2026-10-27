import { z } from "zod";
import type { Concorrencia, IdeiaDePalavra } from "@/api/integracoes/google-ads/planejador";

// Módulo puro (só Zod e tipos): usado no servidor e no navegador. Não importe código de servidor aqui, só tipos.

export const ETAPAS = ["CONCORRENTES", "SITES", "VOLUMES", "RECOMENDACAO"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const esquemaRespostaConcorrentes = z.object({
  concorrentes: z.array(z.object({ nome: z.string(), site: z.string(), motivo: z.string() })),
});

export const esquemaRespostaSites = z.object({
  relatorios: z.array(
    z.object({
      site: z.string(),
      lido: z.boolean(),
      oQueVende: z.string(),
      promessas: z.array(z.string()),
      precos: z.array(z.string()),
      diferenciais: z.array(z.string()),
      pontosFracos: z.array(z.string()),
      fontes: z.array(z.string()),
    }),
  ),
});

export const esquemaRespostaRecomendacao = z.object({
  palavras: z.array(z.object({ texto: z.string(), correspondencia: z.enum(["EXATA", "FRASE"]), motivo: z.string() })),
  negativas: z.array(z.object({ termo: z.string(), motivo: z.string() })),
});

export interface Concorrente {
  nome: string;
  dominio: string;
  motivo: string;
}

export type RelatorioDeConcorrente = z.infer<typeof esquemaRespostaSites>["relatorios"][number] & { dominio: string };

export type Volumes = { disponivel: true; ideias: IdeiaDePalavra[] } | { disponivel: false; motivo: string };

export interface PalavraRecomendada {
  texto: string;
  correspondencia: "Exata" | "Frase";
  motivo: string;
  volumeMensal: number | null;
  concorrencia: Concorrencia;
  lanceBaixo: number | null;
  lanceAlto: number | null;
}

export interface NegativaSugerida {
  termo: string;
  motivo: string;
}

export interface PontoDePartida {
  dominio: string | null;
  palavras: string[];
  idsGeo: string[];
  nomesGeo: string[];
  idiomas: string[];
}

export interface PesquisaSalva {
  id: string;
  criadoEm: string;
  etapa: Etapa | "CONCLUIDA";
  erroEtapa: string | null;
  custoDolares: number;
  pontoDePartida: PontoDePartida;
  concorrentes: Concorrente[] | null;
  relatorios: RelatorioDeConcorrente[] | null;
  volumes: Volumes | null;
  recomendadas: PalavraRecomendada[] | null;
  negativas: NegativaSugerida[] | null;
}
