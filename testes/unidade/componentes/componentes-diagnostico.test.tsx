import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ItemDiagnostico } from "@/componentes/ItemDiagnostico";
import { SeloNota } from "@/componentes/SeloNota";
import { TabelaDados } from "@/componentes/TabelaDados";

describe("SeloNota", () => {
  it.each([
    [85, "bg-apoio", "Boa"],
    [60, "bg-aviso", "Média"],
    [30, "bg-erro", "Ruim"],
  ])("nota %i usa %s e o rótulo %s", (nota, cor, rotulo) => {
    const html = renderToStaticMarkup(<SeloNota nota={nota} />);
    expect(html).toContain(cor);
    expect(html).toContain(rotulo);
    expect(html).toContain(`Nota ${nota} de 100`);
  });

  it("sem dados", () => {
    const html = renderToStaticMarkup(<SeloNota nota={null} />);
    expect(html).toContain("Sem dados");
    expect(html).toContain("bg-borda");
  });
});

describe("ItemDiagnostico", () => {
  it("erro mostra ✕, como corrigir e pontos perdidos", () => {
    const html = renderToStaticMarkup(
      <ItemDiagnostico
        item={{ regra: "limiteDeCaracteres", situacao: "erro", problema: "Texto longo", comoCorrigir: "Encurte", pontosPerdidos: 15 }}
      />,
    );
    expect(html).toContain("✕");
    expect(html).toContain("Encurte");
    expect(html).toContain("−15");
  });

  it("ok mostra ✓ e não mostra pontos", () => {
    const html = renderToStaticMarkup(
      <ItemDiagnostico item={{ regra: "titulosDuplicados", situacao: "ok", problema: "Nada repetido", comoCorrigir: null, pontosPerdidos: 0 }} />,
    );
    expect(html).toContain("✓");
    expect(html).not.toContain("Como corrigir");
    expect(html).not.toContain("−");
  });
});

describe("TabelaDados com link", () => {
  it("a coluna de link vira <a> para o href da linha", () => {
    const html = renderToStaticMarkup(
      <TabelaDados
        titulo="T"
        colunaComLink="titulo"
        colunas={[{ chave: "titulo", titulo: "Anúncio", formato: "texto" }]}
        linhas={[{ chave: "1", titulo: "Sofás", href: "/anuncios/10~1" }]}
      />,
    );
    expect(html).toContain('href="/anuncios/10~1"');
    expect(html).toContain(">Sofás</a>");
  });
});
