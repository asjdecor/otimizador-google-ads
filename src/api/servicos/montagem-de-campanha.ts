import { LIMITE_DESCRICAO, LIMITE_TITULO, normalizarTexto } from "./diagnostico";
import { filtrarTextosValidos } from "./sugestoes";

export interface PalavraParaCampanha {
  texto: string;
  correspondencia: "EXATA" | "FRASE";
  motivo?: string;
}

export interface AnuncioDeRascunho {
  titulos: string[];
  descricoes: string[];
  urlFinal: string;
}

export interface GrupoDeCampanha {
  nome: string;
  palavras: string[];
  anuncio: AnuncioDeRascunho;
}

export interface RascunhoDeCampanha {
  nome: string;
  orcamentoDiarioCentavos: number;
  orcamentoMensalEstimadoCentavos: number;
  grupos: GrupoDeCampanha[];
  palavras: PalavraParaCampanha[];
  negativas: string[];
  urlFinal: string;
  estrategiaDeLance: "Maximizar conversões" | "Maximizar cliques";
}

export interface EntradaDaMontagemDeCampanha {
  nome: string;
  orcamentoDiarioCentavos: number;
  palavras: PalavraParaCampanha[];
  negativas?: string[];
  urlFinal?: string;
  tema?: string;
}

const TITULOS_BASE = [
  "{palavra} com atendimento rápido",
  "{palavra} para sua rotina",
  "{palavra} com qualidade",
  "{palavra} sem complicação",
  "{palavra} em poucos passos",
  "Solucione com {palavra}",
  "Seu {palavra} agora",
  "Especialista em {palavra}",
  "{palavra} sob medida",
  "{palavra} confiável",
  "{palavra} sem perder tempo",
  "{palavra} pensado para você",
];

const DESCRICOES_BASE = [
  "Atendimento rápido, prático e pensado para o seu dia a dia.",
  "Qualidade, confiança e resultado em um só lugar.",
  "Receba orientação especializada e escolha o melhor para você.",
  "Soluções simples, seguras e feitas para a sua necessidade.",
  "Compare, escolha e tenha um atendimento que entende o seu negócio.",
  "Praticidade, suporte e garantia para cada passo da compra.",
  "Faça a escolha certa com quem entende do seu segmento.",
];

function textoSeguro(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

function grupoNomeDoTema(tema: string, indice: number): string {
  const base = textoSeguro(tema || "Pesquisa");
  return `${base} ${indice + 1}`;
}

function montarTitulosParaGrupo(palavras: string[], tema: string): string[] {
  const usados = new Set<string>();
  const todos: string[] = [];

  for (const palavra of palavras) {
    for (const template of TITULOS_BASE) {
      const titulo = template.replace(/\{palavra\}/g, palavra).replace(/\{tema\}/g, tema);
      todos.push(titulo);
    }
  }

  const filtrados = filtrarTextosValidos(todos, LIMITE_TITULO, usados);
  const tituloFinal = [...filtrados.validos];

  for (const palavra of palavras) {
    const fillers = [
      `${tema} com ${palavra}`,
      `${palavra} com qualidade`,
      `Seu ${palavra} hoje`,
      `${palavra} em poucos passos`,
      `${tema} e ${palavra}`,
    ];
    for (const texto of fillers) {
      if (tituloFinal.length >= 10) break;
      const resultado = filtrarTextosValidos([texto], LIMITE_TITULO, new Set(tituloFinal.map(normalizarTexto)));
      const tituloValido = resultado.validos[0];
      if (tituloValido) tituloFinal.push(tituloValido);
    }
  }

  while (tituloFinal.length < 10) {
    const texto = `${tema} ${tituloFinal.length + 1}`;
    const resultado = filtrarTextosValidos([texto], LIMITE_TITULO, new Set(tituloFinal.map(normalizarTexto)));
    const tituloValido = resultado.validos[0];
    if (tituloValido) tituloFinal.push(tituloValido);
    else break;
  }

  return tituloFinal.slice(0, 10);
}

function montarDescricoesParaGrupo(): string[] {
  const usados = new Set<string>();
  const descricoes = filtrarTextosValidos(DESCRICOES_BASE, LIMITE_DESCRICAO, usados);
  return descricoes.validos.slice(0, 4);
}

function agruparPalavrasEmGrupos(palavras: PalavraParaCampanha[], tema: string): GrupoDeCampanha[] {
  const candidatos = [...palavras].filter((item) => item.texto.trim()).slice(0, 9);
  if (candidatos.length === 0) return [];

  const maximoGrupos = Math.min(3, Math.max(1, Math.ceil(candidatos.length / 3)));
  const tamanhoPorGrupo = Math.ceil(candidatos.length / maximoGrupos);
  const grupos: GrupoDeCampanha[] = [];

  for (let indice = 0; indice < maximoGrupos; indice += 1) {
    const faixa = candidatos.slice(indice * tamanhoPorGrupo, (indice + 1) * tamanhoPorGrupo);
    if (faixa.length === 0) continue;
    const palavrasDoGrupo = faixa.map((item) => textoSeguro(item.texto));
    grupos.push({
      nome: grupoNomeDoTema(tema, indice),
      palavras: palavrasDoGrupo,
      anuncio: {
        titulos: montarTitulosParaGrupo(palavrasDoGrupo, tema),
        descricoes: montarDescricoesParaGrupo(),
        urlFinal: "",
      },
    });
  }

  return grupos;
}

/**
 * Monta um rascunho de campanha a partir das palavras escolhidas pela pesquisa. A regra
 * do PRD exige 1 a 3 grupos, 1 anúncio responsivo por grupo e textos dentro dos limites.
 */
export function montarRascunho(entrada: EntradaDaMontagemDeCampanha): RascunhoDeCampanha {
  const tema = textoSeguro(entrada.tema ?? "Pesquisa");
  const palavras = (entrada.palavras ?? []).filter((item) => textoSeguro(item.texto).length > 0);
  const negativas = (entrada.negativas ?? []).map((termo) => textoSeguro(termo)).filter(Boolean);
  const urlFinal = textoSeguro(entrada.urlFinal ?? "https://example.com");

  const grupos = agruparPalavrasEmGrupos(palavras, tema);
  if (grupos.length === 0) {
    throw new Error("Selecione pelo menos uma palavra para montar a campanha.");
  }

  const gruposComAnuncio = grupos.map((grupo, indice) => ({
    ...grupo,
    anuncio: {
      ...grupo.anuncio,
      urlFinal,
      titulos: grupo.anuncio.titulos.length >= 10 ? grupo.anuncio.titulos.slice(0, 10) : grupo.anuncio.titulos,
      descricoes: grupo.anuncio.descricoes.length >= 4 ? grupo.anuncio.descricoes.slice(0, 4) : grupo.anuncio.descricoes,
    },
    nome: grupo.nome || grupoNomeDoTema(tema, indice),
  }));

  const todosTitulos = gruposComAnuncio.flatMap((grupo) => grupo.anuncio.titulos);
  const todosDescricoes = gruposComAnuncio.flatMap((grupo) => grupo.anuncio.descricoes);

  if (todosTitulos.length < 10 || todosDescricoes.length < 4) {
    throw new Error("A montagem da campanha gerou textos insuficientes para revisão. Escolha mais palavras.");
  }

  return {
    nome: textoSeguro(entrada.nome || `${tema} - ${new Date().toISOString().slice(0, 10)}`),
    orcamentoDiarioCentavos: entrada.orcamentoDiarioCentavos,
    orcamentoMensalEstimadoCentavos: Math.round(entrada.orcamentoDiarioCentavos * 30.4),
    grupos: gruposComAnuncio,
    palavras: palavras.map((item) => ({ ...item, texto: textoSeguro(item.texto) })),
    negativas,
    urlFinal,
    estrategiaDeLance: "Maximizar cliques",
  };
}
