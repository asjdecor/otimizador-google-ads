import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { claudeEstaConfigurado, lerConfiguracaoClaude, MODELO_CLAUDE_PADRAO } from "@/api/configuracao/ambiente";
import { ErroParaUsuario } from "@/api/erro-para-usuario";
import {
  criarGeradorClaude,
  estimarCustoEmDolares,
  interpretarRespostaDoClaude,
  PRECO_POR_BUSCA_NA_WEB,
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

  it.each(["web_search", "web_fetch"])("BadRequestError que cita %s pede para liberar a pesquisa na web", (ferramenta) => {
    const erro = new Anthropic.BadRequestError(400, undefined, `${ferramenta} is not enabled for this organization`, cabecalhos);
    expect(traduzirErroDoClaude(erro).message).toBe(
      "A pesquisa na web não está liberada na sua conta da Anthropic. Ative em Console → Settings → Privacy.",
    );
  });

  it("outros BadRequestError mantêm a mensagem de configuração inválida", () => {
    const erro = new Anthropic.BadRequestError(400, undefined, "max_tokens too large", cabecalhos);
    expect(traduzirErroDoClaude(erro).message).toContain("configuração inválida");
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

  it("soma o preço das buscas na web", () => {
    expect(PRECO_POR_BUSCA_NA_WEB).toBe(0.01);
    expect(estimarCustoEmDolares("claude-opus-5-5", 1_000_000, 0, 10)).toBe(4 + 0.1);
    expect(estimarCustoEmDolares("modelo-desconhecido", 1, 1, 10)).toBeNull();
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

describe("pesquisarNaWeb", () => {
  const config = { apiKey: "k", modelo: "claude-opus-5-5" };
  const esquema = z.object({ concorrentes: z.array(z.string()) });
  const pedido = { sistema: "sis", mensagem: "pesquise", esquema, maxBuscas: 8, maxLeituras: 4 };

  function resposta(
    stop_reason: string,
    parsed_output: unknown,
    extras: { content?: unknown[]; entrada?: number; saida?: number; buscas?: number | null; modelo?: string } = {},
  ) {
    return {
      model: extras.modelo ?? "claude-opus-5-5",
      stop_reason,
      parsed_output,
      content: extras.content ?? [{ type: "text", text: "..." }],
      usage: {
        input_tokens: extras.entrada ?? 100,
        output_tokens: extras.saida ?? 10,
        server_tool_use: extras.buscas === null ? null : { web_search_requests: extras.buscas ?? 0, web_fetch_requests: 0 },
      },
    };
  }

  function criarClienteFalso(...respostas: unknown[]) {
    const parse = vi.fn();
    for (const r of respostas) parse.mockResolvedValueOnce(r);
    const cliente = { beta: { messages: { parse } } } as unknown as Anthropic;
    return { gerador: criarGeradorClaude(config, cliente), parse };
  }

  it("envia as ferramentas de busca e leitura com os limites e o mesmo formato de gerarJson", async () => {
    const { gerador, parse } = criarClienteFalso(resposta("end_turn", { concorrentes: ["a"] }, { buscas: 3, entrada: 50, saida: 7 }));
    const resultado = await gerador.pesquisarNaWeb(pedido);
    expect(resultado).toEqual({ dados: { concorrentes: ["a"] }, modelo: "claude-opus-5-5", tokensEntrada: 50, tokensSaida: 7, buscasNaWeb: 3 });
    const enviado = parse.mock.calls[0]![0];
    expect(enviado.tools).toEqual([
      { type: "web_search_20260318", name: "web_search", max_uses: 8 },
      { type: "web_fetch_20260318", name: "web_fetch", max_uses: 4 },
    ]);
    expect(enviado.model).toBe("claude-opus-5-5");
    expect(enviado.system).toBe("sis");
    expect(enviado.messages).toEqual([{ role: "user", content: "pesquise" }]);
    expect(enviado.betas).toContain("server-side-fallback-2026-07-01");
    expect(enviado.fallbacks).toBe("default");
    expect(enviado.output_config.effort).toBe("medium");
    expect(enviado.output_config.format).toBeDefined();
  });

  it("não envia a ferramenta cujo limite é 0", async () => {
    const soBusca = criarClienteFalso(resposta("end_turn", { concorrentes: [] }));
    await soBusca.gerador.pesquisarNaWeb({ ...pedido, maxBuscas: 8, maxLeituras: 0 });
    expect(soBusca.parse.mock.calls[0]![0].tools).toEqual([{ type: "web_search_20260318", name: "web_search", max_uses: 8 }]);

    const soLeitura = criarClienteFalso(resposta("end_turn", { concorrentes: [] }));
    await soLeitura.gerador.pesquisarNaWeb({ ...pedido, maxBuscas: 0, maxLeituras: 5 });
    expect(soLeitura.parse.mock.calls[0]![0].tools).toEqual([{ type: "web_fetch_20260318", name: "web_fetch", max_uses: 5 }]);
  });

  it("os dois limites em 0 é erro de programação, sem chamar a API", async () => {
    const { gerador, parse } = criarClienteFalso();
    const promessa = gerador.pesquisarNaWeb({ ...pedido, maxBuscas: 0, maxLeituras: 0 });
    await expect(promessa).rejects.toThrow(Error);
    await expect(promessa).rejects.not.toBeInstanceOf(ErroParaUsuario);
    expect(parse).not.toHaveBeenCalled();
  });

  it("com pause_turn continua a conversa, soma tokens e buscas e devolve a última resposta", async () => {
    const conteudo1 = [{ type: "server_tool_use", id: "s1", name: "web_search", input: { query: "x" } }];
    const conteudo2 = [{ type: "text", text: "pausa 2" }];
    const { gerador, parse } = criarClienteFalso(
      resposta("pause_turn", null, { content: conteudo1, entrada: 100, saida: 10, buscas: 2 }),
      resposta("pause_turn", null, { content: conteudo2, entrada: 200, saida: 20, buscas: 3 }),
      resposta("end_turn", { concorrentes: ["b"] }, { entrada: 300, saida: 30, buscas: null, modelo: "claude-sonnet-5-5" }),
    );
    const resultado = await gerador.pesquisarNaWeb(pedido);
    expect(resultado).toEqual({ dados: { concorrentes: ["b"] }, modelo: "claude-sonnet-5-5", tokensEntrada: 600, tokensSaida: 60, buscasNaWeb: 5 });
    expect(parse).toHaveBeenCalledTimes(3);
    expect(parse.mock.calls[1]![0].messages).toEqual([
      { role: "user", content: "pesquise" },
      { role: "assistant", content: conteudo1 },
    ]);
    expect(parse.mock.calls[2]![0].messages).toEqual([
      { role: "user", content: "pesquise" },
      { role: "assistant", content: conteudo2 },
    ]);
    expect(parse.mock.calls[2]![0].tools).toEqual(parse.mock.calls[0]![0].tools);
  });

  it("depois de 3 continuações ainda pausada, desiste com mensagem para o usuário", async () => {
    const pausa = resposta("pause_turn", null);
    const { gerador, parse } = criarClienteFalso(pausa, pausa, pausa, pausa, pausa);
    const promessa = gerador.pesquisarNaWeb(pedido);
    await expect(promessa).rejects.toBeInstanceOf(ErroParaUsuario);
    await expect(promessa).rejects.toThrow("A pesquisa na web demorou demais. Tente esta etapa de novo.");
    expect(parse).toHaveBeenCalledTimes(4);
  });

  it.each([
    ["refusal", null, "recusou"],
    ["max_tokens", null, "cortada"],
    ["end_turn", null, "formato inesperado"],
  ])("stop_reason %s usa as mensagens de interpretarRespostaDoClaude", async (stop, saida, trecho) => {
    const { gerador } = criarClienteFalso(resposta(stop, saida));
    await expect(gerador.pesquisarNaWeb(pedido)).rejects.toThrow(trecho);
  });

  it("erros do SDK passam por traduzirErroDoClaude", async () => {
    const parse = vi.fn().mockRejectedValue(new Anthropic.BadRequestError(400, undefined, "web_fetch not allowed", new Headers()));
    const gerador = criarGeradorClaude(config, { beta: { messages: { parse } } } as unknown as Anthropic);
    await expect(gerador.pesquisarNaWeb(pedido)).rejects.toThrow("A pesquisa na web não está liberada");
  });
});
