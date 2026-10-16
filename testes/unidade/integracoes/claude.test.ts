import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { claudeEstaConfigurado, lerConfiguracaoClaude, MODELO_CLAUDE_PADRAO } from "@/api/configuracao/ambiente";
import { ErroParaUsuario } from "@/api/erro-para-usuario";
import {
  estimarCustoEmDolares,
  interpretarRespostaDoClaude,
  traduzirErroDoClaude,
} from "@/api/integracoes/claude/cliente";
import { formatarCustoDaIa } from "@/api/servicos/formatacao";

const base = { model: "claude-opus-5-5", usage: { input_tokens: 10, output_tokens: 20 } };

describe("interpretarRespostaDoClaude", () => {
  it("devolve dados, modelo e tokens", () => {
    expect(interpretarRespostaDoClaude({ ...base, stop_reason: "end_turn", parsed_output: { ok: 1 } })).toEqual({
      dados: { ok: 1 },
      modelo: "claude-opus-5-5",
      tokensEntrada: 10,
      tokensSaida: 20,
    });
  });

  it("recusa, corte e formato inválido viram mensagens para o usuário", () => {
    expect(() => interpretarRespostaDoClaude({ ...base, stop_reason: "refusal", parsed_output: null })).toThrow(ErroParaUsuario);
    expect(() => interpretarRespostaDoClaude({ ...base, stop_reason: "max_tokens", parsed_output: null })).toThrow("cortada");
    expect(() => interpretarRespostaDoClaude({ ...base, stop_reason: "end_turn", parsed_output: null })).toThrow("formato inesperado");
  });
});

describe("traduzirErroDoClaude", () => {
  const cabecalhos = new Headers();
  it.each([
    [new Anthropic.AuthenticationError(401, undefined, "x", cabecalhos), "ANTHROPIC_API_KEY"],
    [new Anthropic.NotFoundError(404, undefined, "x", cabecalhos), "CLAUDE_MODEL"],
    [new Anthropic.RateLimitError(429, undefined, "x", cabecalhos), "Espere um pouco"],
    [new Anthropic.InternalServerError(500, undefined, "x", cabecalhos), "Tente de novo em instantes"],
    [new Anthropic.APIConnectionError({ message: "offline" }), "Tente de novo em instantes"],
  ])("%o", (erro, trecho) => {
    const traduzido = traduzirErroDoClaude(erro);
    expect(traduzido).toBeInstanceOf(ErroParaUsuario);
    expect(traduzido.message).toContain(trecho);
  });

  it("mantém erros já preparados e outros erros", () => {
    const pronto = new ErroParaUsuario("pronto");
    expect(traduzirErroDoClaude(pronto)).toBe(pronto);
    expect(traduzirErroDoClaude(new TypeError("bug")).message).toBe("bug");
  });
});

describe("custo e configuração", () => {
  it("estima o custo pela tabela de preços", () => {
    expect(estimarCustoEmDolares("claude-opus-5-5", 1_000_000, 0)).toBe(4);
    expect(estimarCustoEmDolares("claude-sonnet-5-5", 0, 1_000_000)).toBe(10);
    expect(estimarCustoEmDolares("modelo-desconhecido", 1, 1)).toBeNull();
  });

  it("formata o custo para a tela", () => {
    expect(formatarCustoDaIa(0.034)).toMatch(/^≈ US\$\s0,03$/);
    expect(formatarCustoDaIa(0.004)).toBe("< US$ 0,01");
    expect(formatarCustoDaIa(null)).toBe("custo não estimado");
  });

  it("modelo padrão é o Opus 5.5 e a chave é obrigatória", () => {
    expect(lerConfiguracaoClaude({ ANTHROPIC_API_KEY: "k" })).toEqual({ apiKey: "k", modelo: MODELO_CLAUDE_PADRAO });
    expect(MODELO_CLAUDE_PADRAO).toBe("claude-opus-5-5");
    expect(lerConfiguracaoClaude({ ANTHROPIC_API_KEY: "k", CLAUDE_MODEL: "claude-sonnet-5-5" }).modelo).toBe("claude-sonnet-5-5");
    expect(() => lerConfiguracaoClaude({ ANTHROPIC_API_KEY: " " })).toThrow("ANTHROPIC_API_KEY");
    expect(claudeEstaConfigurado({})).toBe(false);
  });
});
