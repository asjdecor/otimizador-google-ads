import type { z } from "zod";
import { normalizarDominio } from "@/api/integracoes/google-ads/segmentacao";
import { normalizarTexto } from "./diagnostico";
import type {
  Concorrente,
  esquemaRespostaConcorrentes,
  esquemaRespostaRecomendacao,
  esquemaRespostaSites,
  NegativaSugerida,
  PalavraRecomendada,
  RelatorioDeConcorrente,
  Volumes,
} from "./esquema-pesquisa-de-mercado";
import { MAXIMO_CARACTERES_PALAVRA, MAXIMO_PALAVRAS_POR_PALAVRA_CHAVE } from "./limites-de-sugestao";

// Funções puras (sem rede nem banco) que limpam o que a IA devolve na pesquisa de mercado.

export const MAXIMO_CONCORRENTES = 8;
const MAXIMO_MOTIVO = 200;
const MAXIMO_NEGATIVAS = 50;

/** Sites que não são concorrentes diretos de uma loja/serviço. */
export const MARKETPLACES: readonly string[] = [
  "mercadolivre.com.br",
  "amazon.com.br",
  "magazineluiza.com.br",
  "shopee.com.br",
  "americanas.com.br",
  "casasbahia.com.br",
  "olx.com.br",
  "aliexpress.com",
  "google.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "reclameaqui.com.br",
  "wikipedia.org",
];

const ENDERECO_IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

function ehMarketplace(dominio: string): boolean {
  return MARKETPLACES.some((m) => dominio === m || dominio.endsWith(`.${m}`));
}

function limparMotivo(motivo: string): string {
  return motivo.replace(/\s+/g, " ").trim().slice(0, MAXIMO_MOTIVO);
}

export function filtrarConcorrentes(resposta: z.infer<typeof esquemaRespostaConcorrentes>, dominioProprio: string | null): Concorrente[] {
  const proprio = dominioProprio ? normalizarDominio(dominioProprio) : null;
  const vistos = new Set<string>();
  const resultado: Concorrente[] = [];
  for (const item of resposta.concorrentes) {
    if (item.site.includes("@")) continue;
    const dominio = normalizarDominio(item.site);
    if (!dominio || ENDERECO_IPV4.test(dominio)) continue;
    if (dominio === proprio || ehMarketplace(dominio) || vistos.has(dominio)) continue;
    vistos.add(dominio);
    resultado.push({ nome: item.nome.replace(/\s+/g, " ").trim(), dominio, motivo: limparMotivo(item.motivo) });
  }
  return resultado.slice(0, MAXIMO_CONCORRENTES);
}

export function filtrarRelatorios(resposta: z.infer<typeof esquemaRespostaSites>, concorrentes: Concorrente[]): RelatorioDeConcorrente[] {
  const porDominio = new Map<string, z.infer<typeof esquemaRespostaSites>["relatorios"][number]>();
  for (const relatorio of resposta.relatorios) {
    const dominio = normalizarDominio(relatorio.site);
    if (dominio && !porDominio.has(dominio)) porDominio.set(dominio, relatorio);
  }
  return concorrentes.map((c) => {
    const relatorio = porDominio.get(c.dominio);
    if (!relatorio) {
      return { site: c.dominio, lido: false, oQueVende: "", promessas: [], precos: [], diferenciais: [], pontosFracos: [], fontes: [], dominio: c.dominio };
    }
    return { ...relatorio, site: c.dominio, dominio: c.dominio, fontes: relatorio.fontes.filter((f) => /^https?:\/\//i.test(f.trim())).map((f) => f.trim()) };
  });
}

function textoValido(texto: string): boolean {
  return texto.length > 0 && texto.length <= MAXIMO_CARACTERES_PALAVRA && texto.split(" ").length <= MAXIMO_PALAVRAS_POR_PALAVRA_CHAVE;
}

export function filtrarRecomendacoes(
  resposta: z.infer<typeof esquemaRespostaRecomendacao>,
  volumes: Volumes,
  palavrasAtuais: string[],
): { recomendadas: PalavraRecomendada[]; negativas: NegativaSugerida[] } {
  const jaVistas = new Set(palavrasAtuais.map(normalizarTexto));
  const ideias = volumes.disponivel ? new Map(volumes.ideias.map((i) => [normalizarTexto(i.texto), i])) : null;

  const recomendadas: PalavraRecomendada[] = [];
  for (const item of resposta.palavras) {
    const texto = item.texto.replace(/\s+/g, " ").trim();
    const chave = normalizarTexto(texto);
    if (!chave || jaVistas.has(chave) || !textoValido(texto)) continue;
    const ideia = ideias?.get(chave);
    if (ideias && !ideia) continue;
    jaVistas.add(chave);
    recomendadas.push({
      texto: ideia ? ideia.texto : texto,
      correspondencia: item.correspondencia === "EXATA" ? "Exata" : "Frase",
      motivo: limparMotivo(item.motivo),
      volumeMensal: ideia ? ideia.volumeMensal : null,
      concorrencia: ideia ? ideia.concorrencia : "SEM_DADOS",
      lanceBaixo: ideia ? ideia.lanceBaixo : null,
      lanceAlto: ideia ? ideia.lanceAlto : null,
    });
  }
  if (ideias) recomendadas.sort((a, b) => (b.volumeMensal ?? -1) - (a.volumeMensal ?? -1));

  const termosVistos = new Set<string>();
  const negativas: NegativaSugerida[] = [];
  for (const item of resposta.negativas) {
    const termo = item.termo.replace(/\s+/g, " ").trim();
    const chave = normalizarTexto(termo);
    if (!chave || termo.length > MAXIMO_CARACTERES_PALAVRA || termosVistos.has(chave)) continue;
    termosVistos.add(chave);
    negativas.push({ termo, motivo: limparMotivo(item.motivo) });
  }
  return { recomendadas, negativas: negativas.slice(0, MAXIMO_NEGATIVAS) };
}
