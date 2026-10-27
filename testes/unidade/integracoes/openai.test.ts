import { describe, expect, it } from "vitest";
import { criarGeradorOpenAI } from "@/api/integracoes/openai/cliente";
import { AGENTES_ANALISE_PREMIUM, esquemaRespostaPremium } from "@/api/servicos/esquema-analise-premium";

function criarAnalise() {
  return {
    resumo: "Análise baseada nos dados enviados.",
    scoreTotal: 80,
    agentes: AGENTES_ANALISE_PREMIUM.map((agente) => ({
      agente,
      score: null,
      prioridade: "baixa" as const,
      observacoes: ["Sem informação suficiente para pontuar."],
      recomendacoes: ["Coletar mais dados antes de agir."],
    })),
    correcoes: [],
    palavrasPriorizadas: ["sofá sob medida"],
    riscos: [],
  };
}

describe("criarGeradorOpenAI", () => {
  it("usa Responses API com saída estruturada e valida o JSON com o esquema pedido", async () => {
    const analise = criarAnalise();
    const fakeFetch: typeof fetch = async (_input, init) => {
      const request = JSON.parse(String(init?.body)) as {
        model: string;
        input: Array<{ role: string; content: string }>;
        text: { format: { type: string; strict: boolean } };
      };
      expect(request.model).toBe("gpt-4.1-mini");
      expect(request.input.map((item) => item.role)).toEqual(["system", "user"]);
      expect(request.text.format).toMatchObject({ type: "json_schema", strict: true });

      return new Response(
        JSON.stringify({
          output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(analise) }] }],
          usage: { input_tokens: 120, output_tokens: 90 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    const gerador = criarGeradorOpenAI({ apiKey: "test-key", modelo: "gpt-4.1-mini" }, fakeFetch);
    const resposta = await gerador.gerarJson({
      sistema: "system",
      mensagem: "data",
      esquema: esquemaRespostaPremium,
    });

    expect(resposta).toMatchObject({
      dados: analise,
      modelo: "gpt-4.1-mini",
      tokensEntrada: 120,
      tokensSaida: 90,
    });
  });

  it("retorna erro acionável quando a chave não tem permissão", async () => {
    const fakeFetch: typeof fetch = async () => new Response("{}", { status: 401 });
    const gerador = criarGeradorOpenAI({ apiKey: "test-key", modelo: "gpt-4.1-mini" }, fakeFetch);

    await expect(
      gerador.gerarJson({ sistema: "system", mensagem: "data", esquema: esquemaRespostaPremium }),
    ).rejects.toThrow(/OPENAI_API_KEY/);
  });
});
