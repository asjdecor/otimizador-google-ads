import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PalavraRecomendada, PesquisaSalva, RelatorioDeConcorrente } from "@/api/servicos/esquema-pesquisa-de-mercado";
import { CartaoConcorrente } from "@/componentes/CartaoConcorrente";
import { PainelDePesquisa } from "@/componentes/PainelDePesquisa";
import { TabelaDePalavrasRecomendadas } from "@/componentes/TabelaDePalavrasRecomendadas";

const relatorio: RelatorioDeConcorrente = {
  site: "https://loja.com.br",
  dominio: "loja.com.br",
  lido: true,
  oQueVende: "Sofás sob medida",
  promessas: ["Entrega em 7 dias"],
  precos: ["a partir de R$ 1.999"],
  diferenciais: ["Garantia de 5 anos"],
  pontosFracos: ["Site lento"],
  fontes: ["https://loja.com.br/sofas"],
};

const palavra: PalavraRecomendada = {
  texto: "sofá retrátil",
  correspondencia: "Exata",
  motivo: "alta intenção",
  volumeMensal: null,
  concorrencia: "ALTA",
  lanceBaixo: 1.5,
  lanceAlto: 3.25,
};

const pontoDePartida = { dominio: "meusite.com.br", palavras: ["sofá", "poltrona"], idsGeo: [], nomesGeo: ["São Paulo,São Paulo,Brazil"], idiomas: [] };

function pesquisa(extra: Partial<PesquisaSalva>): PesquisaSalva {
  return {
    id: "p1",
    criadoEm: "2026-10-26T10:00:00Z",
    etapa: "SITES",
    erroEtapa: null,
    custoDolares: 0.42,
    pontoDePartida,
    concorrentes: null,
    relatorios: null,
    volumes: null,
    recomendadas: null,
    negativas: null,
    ...extra,
  };
}

describe("CartaoConcorrente", () => {
  it("mostra domínio, promessas e fontes como links seguros", () => {
    const html = renderToStaticMarkup(<CartaoConcorrente relatorio={relatorio} />);
    expect(html).toContain("loja.com.br");
    expect(html).toContain("Entrega em 7 dias");
    expect(html).toMatch(/<a [^>]*href="https:\/\/loja\.com\.br\/sofas"[^>]*>/);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("site não lido mostra o aviso", () => {
    const html = renderToStaticMarkup(<CartaoConcorrente relatorio={{ ...relatorio, lido: false, promessas: [] }} />);
    expect(html).toContain("Não foi possível ler o site.");
  });

  it("não vira link para fonte que não é http(s)", () => {
    const html = renderToStaticMarkup(<CartaoConcorrente relatorio={{ ...relatorio, fontes: ["javascript:alert(1)"] }} />);
    expect(html).not.toContain('href="javascript:');
  });
});

describe("TabelaDePalavrasRecomendadas", () => {
  it("sem volume mostra 'Sem volume' e a faixa de lance em R$", () => {
    const html = renderToStaticMarkup(
      <TabelaDePalavrasRecomendadas palavras={[palavra]} negativas={[]} moeda="BRL" />,
    );
    expect(html).toContain("sofá retrátil");
    expect(html).toContain("Sem volume");
    expect(html).toMatch(/R\$\s1,50/);
    expect(html).toMatch(/R\$\s3,25/);
    expect(html).toMatch(/Exportar CSV \((<!-- -->)?1(<!-- -->)?\)/);
  });
});

describe("PainelDePesquisa", () => {
  it("antes de iniciar mostra o ponto de partida, o custo estimado e o botão", () => {
    const html = renderToStaticMarkup(
      <PainelDePesquisa pesquisaInicial={null} pontoDePartida={pontoDePartida} iaConfigurada moeda="BRL" />,
    );
    expect(html).toContain("A pesquisa mostra o que é público");
    expect(html).toContain("meusite.com.br");
    expect(html).toContain("São Paulo, São Paulo, Brazil");
    expect(html).toContain("Custo estimado: US$ 0,30 a US$ 1,00 por pesquisa.");
    expect(html).toContain("Pesquisar concorrentes");
  });

  it("região vazia mostra o texto de Brasil inteiro", () => {
    const html = renderToStaticMarkup(
      <PainelDePesquisa pesquisaInicial={null} pontoDePartida={{ ...pontoDePartida, nomesGeo: [] }} iaConfigurada moeda="BRL" />,
    );
    expect(html).toContain("Não encontramos a região das suas campanhas; a pesquisa vai considerar o Brasil inteiro.");
  });

  it("com erroEtapa mostra o erro e o botão de tentar de novo", () => {
    const html = renderToStaticMarkup(
      <PainelDePesquisa
        pesquisaInicial={pesquisa({ erroEtapa: "A IA não respondeu." })}
        pontoDePartida={pontoDePartida}
        iaConfigurada
        moeda="BRL"
      />,
    );
    expect(html).toContain("A IA não respondeu.");
    expect(html).toContain("Tentar esta etapa de novo");
  });

  it("sem chave da IA mostra o aviso do .env e não mostra o botão de iniciar", () => {
    const html = renderToStaticMarkup(
      <PainelDePesquisa pesquisaInicial={null} pontoDePartida={pontoDePartida} iaConfigurada={false} moeda="BRL" />,
    );
    expect(html).toContain("ANTHROPIC_API_KEY");
    expect(html).not.toContain("Pesquisar concorrentes");
  });

  it("concluída mostra custo, volumes indisponíveis e 'Nova pesquisa'", () => {
    const html = renderToStaticMarkup(
      <PainelDePesquisa
        pesquisaInicial={pesquisa({
          etapa: "CONCLUIDA",
          relatorios: [relatorio],
          volumes: { disponivel: false, motivo: "sem acesso" },
          recomendadas: [palavra],
          negativas: [],
        })}
        pontoDePartida={pontoDePartida}
        iaConfigurada
        moeda="BRL"
      />,
    );
    expect(html).toMatch(/Custo desta pesquisa: US\$\s0,42/);
    expect(html).toContain("Sem volume (Planejador indisponível: sem acesso)");
    expect(html).toContain("Nova pesquisa");
    expect(html).toContain("loja.com.br");
  });

  it("em andamento sem erro mostra o progresso da etapa", () => {
    const html = renderToStaticMarkup(
      <PainelDePesquisa pesquisaInicial={pesquisa({ etapa: "SITES" })} pontoDePartida={pontoDePartida} iaConfigurada moeda="BRL" />,
    );
    expect(html).toContain("Lendo os sites…");
  });
});
