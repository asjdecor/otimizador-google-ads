import { describe, expect, it } from "vitest";
import type { GeradorDeTexto } from "@/api/integracoes/claude/cliente";
import { AGENTES_ANALISE_PREMIUM, analisarCampanhasPremium, analisarComIasPremium } from "@/api/servicos/analise-premium";

const geradorFalso: GeradorDeTexto = {
  async gerarJson({ esquema }) {
    const dados = {
      resumo: "Campanha com boa intenção, mas risco de custo elevado em palavras de navegação.",
      scoreTotal: 84,
      agentes: AGENTES_ANALISE_PREMIUM.map((agente, indice) => ({
        agente,
        score: 80 + ((indice % 3) * 5),
        prioridade: indice < 3 ? "alta" : "media",
        observacoes: [`Observação do agente ${agente}`],
        recomendacoes: [`Recomendação do agente ${agente}`],
      })),
      correcoes: [
        {
          agente: "pesquisa_palavras",
          titulo: "Repriorizar intenção de compra",
          descricao: "A maioria das palavras tem busca mais navegacional e baixa intenção de conversão.",
          prioridade: "alta",
          impacto: "Aumento de qualidade e redução de custo por conversão.",
          acao: ["Excluir termos genéricos", "Priorizar palavras de compra"],
        },
        {
          agente: "negativas",
          titulo: "Aplicar negativas de escopo",
          descricao: "Reduz o ruído e evita custo com buscas fora do segmento.",
          prioridade: "media",
          impacto: "Melhora de eficiência operacional.",
          acao: ["Adicionar negativas por variação", "Revisar termos irrelevantes"],
        },
      ],
      palavrasPriorizadas: ["sofá sob medida", "cadeira de jantar", "móveis planejados"],
      riscos: ["Alta concorrência em termos genéricos", "CTR baixo em campanhas sem segmentação"],
    };

    const validado = esquema.safeParse(dados);
    if (!validado.success) {
      throw new Error(`Payload inválido: ${validado.error.message}`);
    }

    return {
      dados: validado.data,
      modelo: "claude-test",
      tokensEntrada: 120,
      tokensSaida: 80,
    };
  },
  async pesquisarNaWeb({ esquema }) {
    const dados = {
      resumo: "Pesquisa complementar concluída.",
      scoreTotal: 80,
      agentes: AGENTES_ANALISE_PREMIUM.map((agente) => ({
        agente,
        score: 75,
        prioridade: "media",
        observacoes: [`Busca do agente ${agente}`],
        recomendacoes: [`Ação do agente ${agente}`],
      })),
      correcoes: [],
      palavrasPriorizadas: [],
      riscos: [],
    };
    const validado = esquema.safeParse(dados);
    if (!validado.success) throw new Error(validado.error.message);
    return { dados: validado.data, modelo: "claude-test", tokensEntrada: 0, tokensSaida: 0, buscasNaWeb: 1 };
  },
};

describe("analisarCampanhasPremium", () => {
  it("retorna 10 agentes, diagnóstico premium e correções priorizadas", async () => {
    const resultado = await analisarCampanhasPremium(geradorFalso, {
      palavrasChave: [
        { termo: "sofá sob medida", volumeMensal: 9000, concorrencia: "alta", cpcObservado: 1.5, intencao: "compra" },
        { termo: "móveis planejados", volumeMensal: 5000, concorrencia: "media", cpcObservado: 1.2, intencao: "compra" },
        { termo: "cadeira de jantar", volumeMensal: 3000, concorrencia: "media", cpcObservado: 0.9, intencao: "compra" },
      ],
      campanhas: [
        { nome: "Pesquisa de móveis", custo: 150, conversoes: 8, ctr: 7.4, cpc: 1.2, status: "ATIVA", palavras: ["móveis planejados", "sofá sob medida"] },
      ],
      concorrentes: [{ nome: "Lojas do Móvel", dominio: "https://lojasdomovel.com.br", pontosFortes: ["atendimento", "entrega", "financiamento"] }],
      contexto: "Loja de móveis sob medida com foco em qualidade e atendimento.",
      objetivo: "Elevado volume de conversão e corte de termos genéricos.",
    });

    expect(resultado.agentes).toHaveLength(10);
    expect(resultado.agentes.map((agente) => agente.agente)).toEqual(AGENTES_ANALISE_PREMIUM);
    expect(resultado.correcoes.some((correcao) => correcao.prioridade === "alta")).toBe(true);
    expect(resultado.palavrasPriorizadas).toEqual(expect.arrayContaining(["sofá sob medida", "cadeira de jantar", "móveis planejados"]));
    expect(resultado.scoreTotal).toBeGreaterThanOrEqual(0);
  });

  it("faz fallback quando não há dados de entrada", async () => {
    await expect(
      analisarCampanhasPremium(geradorFalso, {
        palavrasChave: [],
        campanhas: [],
      }),
    ).rejects.toThrow(/Sem dados suficientes/);
  });

  it("combina resultados em paralelo e preserva avisos de um provedor indisponível", async () => {
    const resultado = await analisarComIasPremium(
      [
        { nome: "Claude", gerarJson: geradorFalso.gerarJson },
        {
          nome: "OpenAI",
          async gerarJson() {
            throw new Error("OpenAI indisponível");
          },
        },
      ],
      {
        palavrasChave: [{ termo: "sofá sob medida", volumeMensal: 9000 }],
        campanhas: [{ nome: "Pesquisa", custo: 100, conversoes: 5 }],
      },
    );

    expect(resultado.provedores.map((provedor) => provedor.nome)).toEqual(["Claude"]);
    expect(resultado.avisos).toEqual([expect.stringContaining("OpenAI não concluiu")]);
    expect(resultado.agentes).toHaveLength(10);
    expect(resultado.palavrasPriorizadas).toEqual(["sofá sob medida"]);
  });
});
