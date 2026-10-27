import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessageParam, BetaToolUnion } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { z } from "zod";
import type { ConfiguracaoClaude } from "@/api/configuracao/ambiente";
import { ErroParaUsuario } from "@/api/erro-para-usuario";

export interface RespostaJson<T> {
  dados: T;
  /** Modelo que de fato respondeu (pode ser o de fallback). */
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
}

export interface RespostaDePesquisa<T> extends RespostaJson<T> {
  /** Buscas na web feitas pelo servidor da Anthropic (cobradas à parte). */
  buscasNaWeb: number;
}

export interface PedidoDePesquisa<T> {
  sistema: string;
  mensagem: string;
  esquema: z.ZodType<T>;
  /** Máximo de buscas na web; 0 não oferece a ferramenta de busca. */
  maxBuscas: number;
  /** Máximo de páginas lidas; 0 não oferece a ferramenta de leitura. */
  maxLeituras: number;
}

/**
 * Único ponto de contato com a API do Claude. Os serviços recebem esta interface,
 * então os testes usam uma versão falsa e nunca gastam créditos.
 */
export interface GeradorDeTexto {
  gerarJson<T>(pedido: { sistema: string; mensagem: string; esquema: z.ZodType<T> }): Promise<RespostaJson<T>>;
  /** Como `gerarJson`, mas o Claude pode buscar e ler páginas na web antes de responder. */
  pesquisarNaWeb<T>(pedido: PedidoDePesquisa<T>): Promise<RespostaDePesquisa<T>>;
}

/** Partes da resposta do SDK que importam para nós (facilita testar sem chamar a API). */
export interface RespostaBrutaDoClaude<T> {
  model: string;
  stop_reason: string | null;
  parsed_output: T | null;
  usage: { input_tokens: number; output_tokens: number };
}

export function interpretarRespostaDoClaude<T>(resposta: RespostaBrutaDoClaude<T>): RespostaJson<T> {
  if (resposta.stop_reason === "refusal") {
    throw new ErroParaUsuario(
      "A IA recusou este pedido. Revise o contexto informado (sem termos sensíveis) e tente de novo.",
    );
  }
  if (resposta.stop_reason === "max_tokens") {
    throw new ErroParaUsuario("A resposta da IA veio cortada. Tente de novo.");
  }
  if (resposta.parsed_output === null) {
    throw new ErroParaUsuario("A IA respondeu num formato inesperado. Tente de novo.");
  }
  return {
    dados: resposta.parsed_output,
    modelo: resposta.model,
    tokensEntrada: resposta.usage.input_tokens,
    tokensSaida: resposta.usage.output_tokens,
  };
}

/** Converte erros do SDK em frases que dizem ao usuário o que fazer. */
export function traduzirErroDoClaude(erro: unknown): Error {
  if (erro instanceof ErroParaUsuario) return erro;
  if (erro instanceof Anthropic.AuthenticationError || erro instanceof Anthropic.PermissionDeniedError) {
    return new ErroParaUsuario("Chave da Anthropic inválida ou sem permissão. Confira ANTHROPIC_API_KEY no .env.");
  }
  if (erro instanceof Anthropic.NotFoundError) {
    return new ErroParaUsuario("Modelo de IA não encontrado. Confira CLAUDE_MODEL no .env (ex.: claude-opus-5-5).");
  }
  if (erro instanceof Anthropic.RateLimitError) {
    return new ErroParaUsuario("Muitas gerações seguidas ou créditos esgotados na Anthropic. Espere um pouco e tente de novo.");
  }
  if (erro instanceof Anthropic.BadRequestError && /web_search|web_fetch/.test(erro.message)) {
    return new ErroParaUsuario(
      "A pesquisa na web não está liberada na sua conta da Anthropic. Ative em Console → Settings → Privacy.",
    );
  }
  if (erro instanceof Anthropic.BadRequestError) {
    return new ErroParaUsuario("A API da IA recusou o pedido (configuração inválida). Tente de novo ou troque o modelo.");
  }
  if (erro instanceof Anthropic.APIConnectionError || erro instanceof Anthropic.APIError) {
    return new ErroParaUsuario("Não foi possível falar com a IA agora. Tente de novo em instantes.");
  }
  return erro instanceof Error ? erro : new Error(String(erro));
}

/** Quantas vezes retomamos uma pesquisa que o servidor pausou (`pause_turn`) antes de desistir. */
const MAX_CONTINUACOES_DA_PESQUISA = 3;

export function criarGeradorClaude(config: ConfiguracaoClaude, cliente = new Anthropic({ apiKey: config.apiKey })): GeradorDeTexto {
  /** Parâmetros comuns às duas chamadas: mesmo modelo, fallback e formato de saída. */
  function parametrosComuns<T>(pedido: { sistema: string; esquema: z.ZodType<T> }) {
    return {
      model: config.modelo,
      max_tokens: 16000,
      // Recusa falsa dos filtros de segurança → a API refaz em outro modelo, sem erro para o usuário.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default" as const,
      output_config: { effort: "medium" as const, format: betaZodOutputFormat(pedido.esquema) },
      system: pedido.sistema,
    };
  }

  return {
    async gerarJson<T>(pedido: { sistema: string; mensagem: string; esquema: z.ZodType<T> }) {
      try {
        const resposta = await cliente.beta.messages.parse({
          ...parametrosComuns(pedido),
          messages: [{ role: "user", content: pedido.mensagem }],
        });
        return interpretarRespostaDoClaude<T>({
          model: resposta.model,
          stop_reason: resposta.stop_reason,
          parsed_output: (resposta.parsed_output ?? null) as T | null,
          usage: resposta.usage,
        });
      } catch (erro) {
        throw traduzirErroDoClaude(erro);
      }
    },

    async pesquisarNaWeb<T>(pedido: PedidoDePesquisa<T>) {
      const ferramentas: BetaToolUnion[] = [];
      if (pedido.maxBuscas > 0) ferramentas.push({ type: "web_search_20260318", name: "web_search", max_uses: pedido.maxBuscas });
      if (pedido.maxLeituras > 0) ferramentas.push({ type: "web_fetch_20260318", name: "web_fetch", max_uses: pedido.maxLeituras });
      if (ferramentas.length === 0) throw new Error("pesquisarNaWeb precisa de maxBuscas ou maxLeituras maior que 0.");

      const mensagemDoUsuario: BetaMessageParam = { role: "user", content: pedido.mensagem };
      let mensagens: BetaMessageParam[] = [mensagemDoUsuario];
      let tokensEntrada = 0;
      let tokensSaida = 0;
      let buscasNaWeb = 0;
      try {
        for (let continuacoes = 0; ; continuacoes++) {
          const resposta = await cliente.beta.messages.parse({
            ...parametrosComuns(pedido),
            tools: ferramentas,
            messages: mensagens,
          });
          tokensEntrada += resposta.usage.input_tokens;
          tokensSaida += resposta.usage.output_tokens;
          buscasNaWeb += resposta.usage.server_tool_use?.web_search_requests ?? 0;

          if (resposta.stop_reason === "pause_turn") {
            if (continuacoes >= MAX_CONTINUACOES_DA_PESQUISA) {
              throw new ErroParaUsuario("A pesquisa na web demorou demais. Tente esta etapa de novo.");
            }
            // O servidor pausou um turno longo: devolvemos o que ele já fez para ele continuar dali.
            mensagens = [mensagemDoUsuario, { role: "assistant", content: resposta.content }];
            continue;
          }

          const interpretada = interpretarRespostaDoClaude<T>({
            model: resposta.model,
            stop_reason: resposta.stop_reason,
            parsed_output: (resposta.parsed_output ?? null) as T | null,
            usage: resposta.usage,
          });
          return { ...interpretada, tokensEntrada, tokensSaida, buscasNaWeb };
        }
      } catch (erro) {
        throw traduzirErroDoClaude(erro);
      }
    },
  };
}

/** Preço por milhão de tokens (US$), para mostrar o custo estimado de cada geração. */
const PRECOS_POR_MILHAO: Record<string, { entrada: number; saida: number }> = {
  "claude-opus-5-5": { entrada: 4, saida: 20 },
  "claude-opus-5": { entrada: 5, saida: 25 },
  "claude-opus-4-8": { entrada: 5, saida: 25 },
  "claude-sonnet-5-5": { entrada: 2, saida: 10 },
  "claude-sonnet-5": { entrada: 2, saida: 10 },
  "claude-haiku-5-5": { entrada: 0.1, saida: 0.5 },
};

/** Preço de cada busca na web (US$ 10 por 1.000 buscas). A leitura de páginas só cobra os tokens. */
export const PRECO_POR_BUSCA_NA_WEB = 0.01;

/** Custo aproximado em dólares; null se o modelo não estiver na tabela. */
export function estimarCustoEmDolares(modelo: string, tokensEntrada: number, tokensSaida: number, buscasNaWeb = 0): number | null {
  const preco = PRECOS_POR_MILHAO[modelo];
  if (!preco) return null;
  return (tokensEntrada * preco.entrada + tokensSaida * preco.saida) / 1_000_000 + buscasNaWeb * PRECO_POR_BUSCA_NA_WEB;
}
