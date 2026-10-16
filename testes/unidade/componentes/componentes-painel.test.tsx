import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CardMetrica } from "@/componentes/CardMetrica";
import { TabelaDados } from "@/componentes/TabelaDados";

describe("CardMetrica", () => {
  it("normal mostra rótulo e valor", () => {
    const html = renderToStaticMarkup(<CardMetrica rotulo="Custo" valor="R$ 10,00" />);
    expect(html).toContain("Custo");
    expect(html).toContain("R$ 10,00");
  });

  it("sem dados mostra — em cor suave", () => {
    const html = renderToStaticMarkup(<CardMetrica rotulo="CTR" valor={null} />);
    expect(html).toContain("—");
    expect(html).toContain("text-texto-suave");
  });

  it("erro mostra ! e a mensagem", () => {
    const html = renderToStaticMarkup(<CardMetrica rotulo="CTR" valor="1%" erro />);
    expect(html).toContain("Não foi possível carregar");
    expect(html).not.toContain("1%");
  });

  it("destaque de erro pinta borda e valor", () => {
    const html = renderToStaticMarkup(<CardMetrica rotulo="Desperdício" valor="R$ 99,00" destaque="erro" />);
    expect(html).toContain("border-erro");
    expect(html).toContain("text-erro");
  });
});

describe("TabelaDados", () => {
  const colunas = [
    { chave: "nome", titulo: "Nome", formato: "texto" as const },
    { chave: "custo", titulo: "Custo", formato: "moeda" as const },
    { chave: "ctr", titulo: "CTR", formato: "percentual" as const },
  ];

  it("formata as células e alinha números à direita", () => {
    const html = renderToStaticMarkup(
      <TabelaDados titulo="T" colunas={colunas} linhas={[{ chave: "1", nome: "Sofá", custo: 12.5, ctr: 0.05 }]} />,
    );
    expect(html).toContain("Sofá");
    expect(html).toMatch(/R\$\s12,50/);
    expect(html).toMatch(/5,00\s?%/);
    expect(html).toContain("text-right");
  });

  it("linha de destaque recebe a borda vermelha", () => {
    const html = renderToStaticMarkup(
      <TabelaDados titulo="T" colunas={colunas} linhas={[{ chave: "1", nome: "x", custo: 1, ctr: null, destaque: 1 }]} />,
    );
    expect(html).toContain("border-l-erro");
  });

  it("vazia mostra a mensagem", () => {
    const html = renderToStaticMarkup(<TabelaDados titulo="T" colunas={colunas} linhas={[]} mensagemVazia="Nada aqui" />);
    expect(html).toContain("Nada aqui");
  });

  it("ordem inicial aparece no aria-sort", () => {
    const html = renderToStaticMarkup(
      <TabelaDados titulo="T" colunas={colunas} linhas={[]} ordemInicial={{ coluna: "custo", direcao: "desc" }} />,
    );
    expect(html).toContain('aria-sort="descending"');
  });
});
