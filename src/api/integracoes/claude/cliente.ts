import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
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

/**
 * Único ponto de contato com a API do Claude. Os serviços recebem esta interface,
 * então os testes usam uma versão falsa e nunca gastam créditos.
 */
export interface GeradorDeTexto {
  gerarJson<T>(pedido: { sistema: string; mensagem: string; esquema: z.ZodType<T> }): Promise<RespostaJson<T>>;
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
  if (erro instanceof Anthropic.BadRequestError) {
    return new ErroParaUsuario("A API da IA recusou o pedido (configuração inválida). Tente de novo ou troque o modelo.");
  }
  if (erro instanceof Anthropic.APIConnectionError || erro instanceof Anthropic.APIError) {
    return new ErroParaUsuario("Não foi possível falar com a IA agora. Tente de novo em instantes.");
  }
  return erro instanceof Error ? erro : new Error(String(erro));
}

export function criarGeradorClaude(config: ConfiguracaoClaude, cliente = new Anthropic({ apiKey: config.apiKey })): GeradorDeTexto {
  return {
    async gerarJson<T>(pedido: { sistema: string; mensagem: string; esquema: z.ZodType<T> }) {
      try {
        const resposta = await cliente.beta.messages.parse({
          model: config.modelo,
          max_tokens: 16000,
          // Recusa falsa dos filtros de segurança → a API refaz em outro modelo, sem erro para o usuário.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium", format: betaZodOutputFormat(pedido.esquema) },
          system: pedido.sistema,
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

/** Custo aproximado em dólares; null se o modelo não estiver na tabela. */
export function estimarCustoEmDolares(modelo: string, tokensEntrada: number, tokensSaida: number): number | null {
  const preco = PRECOS_POR_MILHAO[modelo];
  if (!preco) return null;
  return (tokensEntrada * preco.entrada + tokensSaida * preco.saida) / 1_000_000;
}
