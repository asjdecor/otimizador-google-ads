import type { AnuncioRsa } from "@/api/integracoes/google-ads/anuncios";

export const LIMITE_TITULO = 30;
export const LIMITE_DESCRICAO = 90;
export const TITULOS_RECOMENDADOS = 10;
export const DESCRICOES_RECOMENDADAS = 4;

/** Pontos perdidos por regra. Somam 100: um anúncio sem nenhum problema tira 100. */
export const PESOS = {
  poucosTitulos: 12,
  poucasDescricoes: 8,
  limiteDeCaracteres: 15,
  palavraChaveNoTitulo: 20,
  chamadaParaAcao: 15,
  titulosDuplicados: 10,
  forcaRuim: 20,
  forcaMedia: 10,
} as const;

/** Verbos de chamada para ação, já normalizados (sem acento, minúsculos). */
export const VERBOS_DE_ACAO = [
  "compre", "comprar", "peca", "pecam", "solicite", "solicitar", "ligue", "agende", "agendar", "garanta",
  "saiba", "confira", "fale", "chame", "reserve", "assine", "baixe", "experimente", "contrate", "visite",
  "aproveite", "encomende", "faca", "clique", "cadastre", "veja", "descubra", "conheca", "venha", "acesse",
  "inscreva", "teste", "simule", "receba",
];

export type RegraDoDiagnostico =
  | "quantidade"
  | "limiteDeCaracteres"
  | "palavraChaveNoTitulo"
  | "chamadaParaAcao"
  | "titulosDuplicados"
  | "forcaDoAnuncio";

export type SituacaoDoItem = "erro" | "aviso" | "ok";

export interface ItemDoDiagnostico {
  regra: RegraDoDiagnostico;
  situacao: SituacaoDoItem;
  problema: string;
  comoCorrigir: string | null;
  pontosPerdidos: number;
}

export type ClassificacaoDaNota = "Boa" | "Média" | "Ruim";

export interface Diagnostico {
  nota: number;
  classificacao: ClassificacaoDaNota;
  itens: ItemDoDiagnostico[];
}

// ---------- utilitários de texto ----------

/** Minúsculas, sem acento, pontuação vira espaço, espaços colapsados. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Conta caracteres como o Google Ads conta: inserções como {KeyWord:Sofás} valem o texto
 * padrão ("Sofás"), e emojis/acentos contam 1 cada.
 */
export function contarCaracteresVisiveis(texto: string): number {
  return [...texto.replace(/\{[^{}:]+:([^{}]*)\}/g, "$1")].length;
}

function contemTermo(textoNormalizado: string, termoNormalizado: string): boolean {
  return termoNormalizado !== "" && ` ${textoNormalizado} `.includes(` ${termoNormalizado} `);
}

const citar = (textos: string[]) => textos.map((t) => `"${t}"`).join(", ");

// ---------- regras ----------

function avaliarQuantidade(anuncio: AnuncioRsa): ItemDoDiagnostico {
  const faltamTitulos = Math.max(0, TITULOS_RECOMENDADOS - anuncio.titulos.length);
  const faltamDescricoes = Math.max(0, DESCRICOES_RECOMENDADAS - anuncio.descricoes.length);
  const pontos = (faltamTitulos > 0 ? PESOS.poucosTitulos : 0) + (faltamDescricoes > 0 ? PESOS.poucasDescricoes : 0);
  if (pontos === 0) {
    return {
      regra: "quantidade",
      situacao: "ok",
      problema: `${anuncio.titulos.length} títulos e ${anuncio.descricoes.length} descrições.`,
      comoCorrigir: null,
      pontosPerdidos: 0,
    };
  }
  const partes = [
    faltamTitulos > 0 ? `${anuncio.titulos.length} títulos (o ideal é pelo menos ${TITULOS_RECOMENDADOS})` : null,
    faltamDescricoes > 0 ? `${anuncio.descricoes.length} descrições (o ideal é ${DESCRICOES_RECOMENDADAS})` : null,
  ].filter((p) => p !== null);
  return {
    regra: "quantidade",
    situacao: "aviso",
    problema: `Poucas variações: ${partes.join(" e ")}.`,
    comoCorrigir: `Adicione ${[
      faltamTitulos > 0 ? `${faltamTitulos} título(s)` : null,
      faltamDescricoes > 0 ? `${faltamDescricoes} descrição(ões)` : null,
    ]
      .filter((p) => p !== null)
      .join(" e ")}. Mais combinações dão ao Google mais chances de acertar o anúncio para cada busca.`,
    pontosPerdidos: pontos,
  };
}

function avaliarLimiteDeCaracteres(anuncio: AnuncioRsa): ItemDoDiagnostico {
  const longos = [
    ...anuncio.titulos
      .filter((t) => contarCaracteresVisiveis(t) > LIMITE_TITULO)
      .map((t) => `${citar([t])} (${contarCaracteresVisiveis(t)}/${LIMITE_TITULO})`),
    ...anuncio.descricoes
      .filter((d) => contarCaracteresVisiveis(d) > LIMITE_DESCRICAO)
      .map((d) => `${citar([d])} (${contarCaracteresVisiveis(d)}/${LIMITE_DESCRICAO})`),
  ];
  if (longos.length === 0) {
    return {
      regra: "limiteDeCaracteres",
      situacao: "ok",
      problema: `Todos os textos dentro do limite (títulos ≤ ${LIMITE_TITULO}, descrições ≤ ${LIMITE_DESCRICAO}).`,
      comoCorrigir: null,
      pontosPerdidos: 0,
    };
  }
  return {
    regra: "limiteDeCaracteres",
    situacao: "erro",
    problema: `Texto acima do limite: ${longos.join("; ")}.`,
    comoCorrigir: "Encurte esses textos; o Google corta ou recusa o que passa do limite.",
    pontosPerdidos: PESOS.limiteDeCaracteres,
  };
}

function avaliarPalavraChaveNoTitulo(anuncio: AnuncioRsa, palavrasDoGrupo: string[]): ItemDoDiagnostico {
  if (palavrasDoGrupo.length === 0) {
    return {
      regra: "palavraChaveNoTitulo",
      situacao: "ok",
      problema: "O grupo não tem palavras-chave para comparar (não se aplica).",
      comoCorrigir: null,
      pontosPerdidos: 0,
    };
  }
  const titulosNormalizados = anuncio.titulos.map(normalizarTexto);
  const encontrada = palavrasDoGrupo.find((p) => titulosNormalizados.some((t) => contemTermo(t, normalizarTexto(p))));
  if (encontrada) {
    return {
      regra: "palavraChaveNoTitulo",
      situacao: "ok",
      problema: `A palavra-chave "${encontrada}" aparece em um título.`,
      comoCorrigir: null,
      pontosPerdidos: 0,
    };
  }
  return {
    regra: "palavraChaveNoTitulo",
    situacao: "erro",
    problema: "Nenhuma palavra-chave do grupo aparece nos títulos.",
    comoCorrigir: `Use a busca da pessoa no título, ex.: ${citar(palavrasDoGrupo.slice(0, 3))}. Isso aumenta a relevância e o CTR.`,
    pontosPerdidos: PESOS.palavraChaveNoTitulo,
  };
}

function avaliarChamadaParaAcao(anuncio: AnuncioRsa): ItemDoDiagnostico {
  const textos = [...anuncio.titulos, ...anuncio.descricoes];
  const comAcao = textos.find((t) => {
    const palavras = normalizarTexto(t).split(" ");
    return VERBOS_DE_ACAO.some((v) => palavras.includes(v));
  });
  if (comAcao) {
    return {
      regra: "chamadaParaAcao",
      situacao: "ok",
      problema: `Tem chamada para ação: ${citar([comAcao])}.`,
      comoCorrigir: null,
      pontosPerdidos: 0,
    };
  }
  return {
    regra: "chamadaParaAcao",
    situacao: "aviso",
    problema: "Nenhum título ou descrição diz o que a pessoa deve fazer.",
    comoCorrigir: 'Inclua uma chamada para ação, ex.: "Peça seu orçamento", "Compre hoje", "Agende uma visita".',
    pontosPerdidos: PESOS.chamadaParaAcao,
  };
}

function avaliarTitulosDuplicados(anuncio: AnuncioRsa): ItemDoDiagnostico {
  const porTexto = new Map<string, string[]>();
  for (const titulo of anuncio.titulos) {
    const chave = normalizarTexto(titulo);
    porTexto.set(chave, [...(porTexto.get(chave) ?? []), titulo]);
  }
  const repetidos = [...porTexto.values()].filter((grupo) => grupo.length > 1);
  if (repetidos.length === 0) {
    return { regra: "titulosDuplicados", situacao: "ok", problema: "Nenhum título repetido.", comoCorrigir: null, pontosPerdidos: 0 };
  }
  return {
    regra: "titulosDuplicados",
    situacao: "aviso",
    problema: `Títulos repetidos (ignorando maiúsculas e acentos): ${repetidos.map(citar).join(" | ")}.`,
    comoCorrigir: "Troque as repetições por títulos com outro benefício, oferta ou diferencial.",
    pontosPerdidos: PESOS.titulosDuplicados,
  };
}

function avaliarForca(anuncio: AnuncioRsa): ItemDoDiagnostico {
  const base = { regra: "forcaDoAnuncio" as const };
  if (anuncio.forca === "RUIM") {
    return {
      ...base,
      situacao: "erro",
      problema: 'O Google classifica a força deste anúncio como "Ruim".',
      comoCorrigir: "Corrija os outros itens desta lista; títulos variados e com palavra-chave sobem a força.",
      pontosPerdidos: PESOS.forcaRuim,
    };
  }
  if (anuncio.forca === "MEDIA") {
    return {
      ...base,
      situacao: "aviso",
      problema: 'O Google classifica a força deste anúncio como "Média".',
      comoCorrigir: "Adicione títulos mais diferentes entre si e use as palavras-chave do grupo.",
      pontosPerdidos: PESOS.forcaMedia,
    };
  }
  const textos: Record<string, string> = {
    EXCELENTE: 'Força do anúncio "Excelente" no Google.',
    BOA: 'Força do anúncio "Boa" no Google.',
    PENDENTE: "Força do anúncio ainda em análise pelo Google (não se aplica).",
    SEM_DADOS: "O Google não informou a força do anúncio (não se aplica).",
  };
  return { ...base, situacao: "ok", problema: textos[anuncio.forca] ?? "", comoCorrigir: null, pontosPerdidos: 0 };
}

// ---------- nota ----------

export function classificarNota(nota: number): ClassificacaoDaNota {
  if (nota >= 80) return "Boa";
  if (nota >= 50) return "Média";
  return "Ruim";
}

const ORDEM_DA_SITUACAO: Record<SituacaoDoItem, number> = { erro: 0, aviso: 1, ok: 2 };

/**
 * F3 — nota de 0 a 100 por regras fixas e explicadas (PRD F3.2).
 * Função pura: recebe o anúncio e as palavras-chave do grupo, sem acessar nada externo.
 */
export function calcularNotaDoAnuncio(anuncio: AnuncioRsa, palavrasDoGrupo: string[]): Diagnostico {
  const itens = [
    avaliarLimiteDeCaracteres(anuncio),
    avaliarPalavraChaveNoTitulo(anuncio, palavrasDoGrupo),
    avaliarForca(anuncio),
    avaliarChamadaParaAcao(anuncio),
    avaliarQuantidade(anuncio),
    avaliarTitulosDuplicados(anuncio),
  ].sort((a, b) => ORDEM_DA_SITUACAO[a.situacao] - ORDEM_DA_SITUACAO[b.situacao] || b.pontosPerdidos - a.pontosPerdidos);

  const nota = Math.max(0, 100 - itens.reduce((total, item) => total + item.pontosPerdidos, 0));
  return { nota, classificacao: classificarNota(nota), itens };
}
