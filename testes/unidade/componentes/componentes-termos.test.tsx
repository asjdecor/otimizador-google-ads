import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sugerirNegativasPorRegra, sugerirPalavrasNovasPorRegra } from "@/api/servicos/termos";
import { PainelAnaliseDeTermos } from "@/componentes/PainelAnaliseDeTermos";
import { TabelaDeNegativas, TabelaDePalavrasNovas } from "@/componentes/TabelasDeTermos";
import { termo } from "../../apoio/fabricas-termos";

describe("tabelas de termos", () => {
  it("negativas mostram motivo, destaque e o botão de exportar com a quantidade", () => {
    const negativas = sugerirNegativasPorRegra([termo({ termo: "sofá grátis" }), termo({ termo: "sofá usado" })]);
    const html = renderToStaticMarkup(
      <TabelaDeNegativas titulo="T" negativas={negativas} moeda="BRL" nomeDoArquivo="n.csv" mensagemVazia="vazio" />,
    );
    expect(html).toContain("sofá grátis");
    expect(html).toContain("nenhuma conversão");
    expect(html).toContain("border-l-erro");
    expect(html).toMatch(/Exportar CSV \((<!-- -->)?2(<!-- -->)?\)/);
  });

  it("sem itens, o exportar fica desabilitado e aparece a mensagem", () => {
    const html = renderToStaticMarkup(
      <TabelaDePalavrasNovas titulo="T" palavras={[]} moeda="BRL" nomeDoArquivo="p.csv" mensagemVazia="Nada converteu" />,
    );
    expect(html).toContain("Nada converteu");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>⭳ Exportar CSV/);
  });

  it("palavra da IA sem grupo pede para escolher o grupo", () => {
    const [regra] = sugerirPalavrasNovasPorRegra([termo({ termo: "sofá cama", conversoes: 1 })], {});
    const semGrupo = { ...regra!, grupoId: null, grupoNome: "", campanhaNome: "", origem: "ia" as const };
    const html = renderToStaticMarkup(
      <TabelaDePalavrasNovas titulo="T" palavras={[semGrupo]} moeda="BRL" nomeDoArquivo="p.csv" mensagemVazia="" />,
    );
    expect(html).toContain("escolha o grupo");
  });
});

describe("PainelAnaliseDeTermos", () => {
  it("mostra o aviso de revisão e, sem chave, desabilita o botão", () => {
    const html = renderToStaticMarkup(<PainelAnaliseDeTermos analiseInicial={null} iaConfigurada={false} moeda="BRL" />);
    expect(html).toContain("Revise antes de aplicar. A IA pode errar.");
    expect(html).toContain("ANTHROPIC_API_KEY");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Analisar com IA/);
  });
});
