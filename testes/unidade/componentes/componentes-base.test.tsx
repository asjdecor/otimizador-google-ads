import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BotaoCancelar } from "@/componentes/BotaoCancelar";
import { BotaoConfirmar } from "@/componentes/BotaoConfirmar";
import { BotaoVoltar } from "@/componentes/BotaoVoltar";
import { CampoTexto } from "@/componentes/CampoTexto";
import { itemEstaAtivo } from "@/componentes/itens-do-menu";

describe("BotaoConfirmar", () => {
  it("normal: usa a cor primária e o hover escuro", () => {
    const html = renderToStaticMarkup(<BotaoConfirmar>Gerar</BotaoConfirmar>);
    expect(html).toContain("bg-primaria");
    expect(html).toContain("hover:bg-primaria-escura");
    expect(html).toContain(">Gerar<");
    expect(html).not.toContain('disabled=""');
  });

  it("desabilitado: fica com atributo disabled", () => {
    expect(renderToStaticMarkup(<BotaoConfirmar disabled>Gerar</BotaoConfirmar>)).toContain('disabled=""');
  });

  it("carregando: desabilita, marca aria-busy e troca o texto", () => {
    const html = renderToStaticMarkup(
      <BotaoConfirmar carregando textoCarregando="Gerando…">
        Gerar
      </BotaoConfirmar>,
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Gerando…");
    expect(html).not.toContain(">Gerar<");
  });

  it("erro: mostra a mensagem ligada ao botão", () => {
    const html = renderToStaticMarkup(
      <BotaoConfirmar id="gerar" erro="Falhou, tente de novo">
        Gerar
      </BotaoConfirmar>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-describedby="gerar-erro"');
    expect(html).toContain("ring-erro");
  });

  it("é type=button por padrão (não envia formulário sem querer)", () => {
    expect(renderToStaticMarkup(<BotaoConfirmar>Ok</BotaoConfirmar>)).toContain('type="button"');
  });
});

describe("BotaoVoltar e BotaoCancelar", () => {
  it("BotaoVoltar é neutro", () => {
    const html = renderToStaticMarkup(<BotaoVoltar>Voltar</BotaoVoltar>);
    expect(html).toContain("bg-superficie");
    expect(html).toContain("border-borda");
  });

  it("BotaoCancelar usa a cor de erro e inverte no hover", () => {
    const html = renderToStaticMarkup(<BotaoCancelar>Desconectar</BotaoCancelar>);
    expect(html).toContain("text-erro");
    expect(html).toContain("hover:bg-erro");
  });

  it("ambos aceitam disabled", () => {
    expect(renderToStaticMarkup(<BotaoVoltar disabled>V</BotaoVoltar>)).toContain('disabled=""');
    expect(renderToStaticMarkup(<BotaoCancelar disabled>C</BotaoCancelar>)).toContain('disabled=""');
  });
});

describe("CampoTexto", () => {
  it("normal: rótulo ligado ao input", () => {
    const html = renderToStaticMarkup(<CampoTexto id="contexto" rotulo="Diferencial" />);
    expect(html).toContain('for="contexto"');
    expect(html).toContain('id="contexto"');
    expect(html).toContain("border-borda");
    expect(html).not.toContain("aria-invalid");
  });

  it("erro: borda de erro, aria-invalid e mensagem", () => {
    const html = renderToStaticMarkup(<CampoTexto id="valor" rotulo="Limite" erro="Informe um número" />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="valor-erro"');
    expect(html).toContain("border-erro");
    expect(html).toContain("Informe um número");
  });

  it("desabilitado", () => {
    expect(renderToStaticMarkup(<CampoTexto id="x" rotulo="X" disabled />)).toContain('disabled=""');
  });
});

describe("itemEstaAtivo", () => {
  it("Painel fica ativo na rota protegida", () => {
    expect(itemEstaAtivo("/painel", "/painel")).toBe(true);
    expect(itemEstaAtivo("/painel", "/painel/relatorios")).toBe(true);
    expect(itemEstaAtivo("/painel", "/anuncios")).toBe(false);
  });

  it("subrotas ativam o item pai, mas prefixos parecidos não", () => {
    expect(itemEstaAtivo("/anuncios", "/anuncios/123")).toBe(true);
    expect(itemEstaAtivo("/anuncios", "/anuncios")).toBe(true);
    expect(itemEstaAtivo("/anuncios", "/anunciosx")).toBe(false);
  });
});
