import { z } from "zod";
import type { ConfiguracaoOpenAI } from "@/api/configuracao/ambiente";
import { ErroParaUsuario } from "@/api/erro-para-usuario";
import { esquemaRespostaPremium } from "@/api/servicos/esquema-analise-premium";
import type { GeradorDeTexto, PedidoJson, RespostaJson } from "../claude/cliente";

const esquemaRespostaApi = z.object({
  output: z.array(
    z.object({
      type: z.string().optional(),
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    }),
  ),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).optional(),
});

const nomesAgentes = [
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

const prioridade = { type: "string", enum: ["alta", "media", "baixa"] };
const listaDeTexto = { type: "array", items: { type: "string" } };
const esquemaJson = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "scoreTotal", "agentes", "correcoes", "palavrasPriorizadas", "riscos"],
  properties: {
    resumo: { type: "string" },
    scoreTotal: { type: "number", minimum: 0, maximum: 100 },
    agentes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["agente", "score", "prioridade", "observacoes", "recomendacoes"],
        properties: {
          agente: { type: "string", enum: nomesAgentes },
          score: { anyOf: [{ type: "number", minimum: 0, maximum: 100 }, { type: "null" }] },
          prioridade,
          observacoes: listaDeTexto,
          recomendacoes: listaDeTexto,
        },
      },
    },
    correcoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["agente", "titulo", "descricao", "prioridade", "impacto", "acao"],
        properties: {
          agente: { type: "string", enum: nomesAgentes },
          titulo: { type: "string" },
          descricao: { type: "string" },
          prioridade,
          impacto: { type: "string" },
          acao: listaDeTexto,
        },
      },
    },
    palavrasPriorizadas: listaDeTexto,
    riscos: listaDeTexto,
  },
};

const mensagemDeErroOpenAI = (status: number): string => {
  if (status === 401 || status === 403) return "A chave da OpenAI é inválida ou não tem permissão. Confira OPENAI_API_KEY.";
  if (status === 429) return "A OpenAI atingiu o limite de uso ou está sem créditos. Verifique a conta e tente novamente.";
  if (status === 400) return "A OpenAI recusou a solicitação. Confira OPENAI_MODEL e tente novamente.";
  return "A OpenAI não conseguiu concluir a análise. Tente novamente em instantes.";
};

export function criarGeradorOpenAI(
  config: ConfiguracaoOpenAI,
  requisitar: typeof fetch = fetch,
): Pick<GeradorDeTexto, "gerarJson"> {
  return {
    async gerarJson<T>(pedido: PedidoJson<T>): Promise<RespostaJson<T>> {
      let respostaHttp: Response;
      try {
        respostaHttp = await requisitar("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.modelo,
            input: [
              { role: "system", content: pedido.sistema },
              { role: "user", content: pedido.mensagem },
            ],
            text: {
              format: {
                type: "json_schema",
                name: "analise_premium_google_ads",
                strict: true,
                schema: esquemaJson,
              },
            },
          }),
          signal: AbortSignal.timeout(pedido.prazoMs ?? 45_000),
        });
      } catch (erro) {
        if (erro instanceof TypeError || erro instanceof DOMException) {
          throw new ErroParaUsuario("Não foi possível conectar à OpenAI. Verifique a rede e tente novamente.");
        }
        throw erro;
      }

      if (!respostaHttp.ok) {
        throw new ErroParaUsuario(mensagemDeErroOpenAI(respostaHttp.status));
      }

      let corpo: unknown;
      try {
        corpo = await respostaHttp.json();
      } catch {
        throw new ErroParaUsuario("A OpenAI devolveu uma resposta inválida. Tente novamente.");
      }
      const resposta = esquemaRespostaApi.safeParse(corpo);
      if (!resposta.success) {
        throw new ErroParaUsuario("A OpenAI devolveu uma resposta em formato inesperado. Tente novamente.");
      }

      if (resposta.data.output.some((item) => item.content?.some((bloco) => bloco.type === "refusal"))) {
        throw new ErroParaUsuario("A OpenAI recusou a análise. Revise o contexto informado e tente novamente.");
      }

      const textos = resposta.data.output.flatMap((item) =>
        item.content?.flatMap((bloco) => (bloco.type === "output_text" && bloco.text ? [bloco.text] : [])) ?? [],
      );
      if (textos.length === 0) {
        throw new ErroParaUsuario("A OpenAI não retornou uma análise estruturada. Tente novamente.");
      }

      let json: unknown;
      try {
        json = JSON.parse(textos.join("\n"));
      } catch {
        throw new ErroParaUsuario("A OpenAI devolveu uma resposta inválida. Tente novamente.");
      }

      const analise = esquemaRespostaPremium.safeParse(json);
      if (!analise.success) {
        throw new ErroParaUsuario("A análise da OpenAI não passou pela validação de segurança. Tente novamente.");
      }

      const dados = pedido.esquema.parse(analise.data);
      return {
        dados,
        modelo: config.modelo,
        tokensEntrada: resposta.data.usage?.input_tokens ?? 0,
        tokensSaida: resposta.data.usage?.output_tokens ?? 0,
      };
    },
  };
}
