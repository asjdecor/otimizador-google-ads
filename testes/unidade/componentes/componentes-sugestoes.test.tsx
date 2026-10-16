import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ItemSugestao } from "@/componentes/ItemSugestao";
import { ListaDeSugestoes } from "@/componentes/ListaDeSugestoes";
import { PainelDeSugestoes } from "@/componentes/PainelDeSugestoes";

describe("ItemSugestao", () => {
  it("mostra o texto, o contador e o botão de copiar", () => {
    const html = renderToStaticMarkup(<ItemSugestao texto="Peça Seu Orçamento" limite={30} />);
    expect(html).toContain("Peça Seu Orçamento");
    expect(html).toMatch(/18(<!-- -->)?\/(<!-- -->)?30/);
    expect(html).toContain("Copiar");
    expect(html).toContain("text-texto-suave");
  });

  it("contador fica vermelho se passar do limite (guarda; não deve acontecer)", () => {
    expect(renderToStaticMarkup(<ItemSugestao texto={"x".repeat(31)} limite={30} />)).toContain("text-erro");
  });
});

describe("ListaDeSugestoes", () => {
  it("mostra os dois blocos com contagem e copiar todos", () => {
    const html = renderToStaticMarkup(<ListaDeSugestoes titulos={["A", "B"]} descricoes={["C"]} />);
    expect(html).toContain("Títulos sugeridos");
    expect(html).toMatch(/\((<!-- -->)?2(<!-- -->)?\)/);
    expect(html).toContain("Copiar todos");
  });
});

describe("PainelDeSugestoes", () => {
  const sugestao = {
    id: "s1",
    criadoEm: "2026-10-15T14:05:00.000Z",
    contextoUsuario: "frete grátis",
    titulos: ["Título A"],
    descricoes: ["Descrição A."],
    modelo: "claude-opus-5-5",
    custoEstimadoEmDolares: 0.02,
  };

  it("sempre mostra o aviso de revisão", () => {
    const html = renderToStaticMarkup(<PainelDeSugestoes anuncioId="10~1" historicoInicial={[]} iaConfigurada />);
    expect(html).toContain("Revise antes de publicar. A IA pode errar.");
    expect(html).toContain("Gerar sugestões");
  });

  it("sem chave da Anthropic, avisa e desabilita o botão", () => {
    const html = renderToStaticMarkup(<PainelDeSugestoes anuncioId="10~1" historicoInicial={[]} iaConfigurada={false} />);
    expect(html).toContain("ANTHROPIC_API_KEY");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Gerar sugestões/);
  });

  it("mostra a última geração e o histórico das anteriores", () => {
    const html = renderToStaticMarkup(
      <PainelDeSugestoes
        anuncioId="10~1"
        historicoInicial={[sugestao, { ...sugestao, id: "s0", contextoUsuario: "antiga" }]}
        iaConfigurada
      />,
    );
    expect(html).toContain("Título A");
    expect(html).toContain("claude-opus-5-5");
    expect(html).toMatch(/≈ US\$\s0,02/);
    expect(html).toContain("Gerações anteriores");
    expect(html).toContain("antiga");
  });
});
