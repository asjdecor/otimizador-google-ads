import { describe, expect, it } from "vitest";
import type { IdeiaDePalavra } from "@/api/integracoes/google-ads/planejador";
import type { Concorrente, Volumes } from "@/api/servicos/esquema-pesquisa-de-mercado";
import { filtrarConcorrentes, filtrarRecomendacoes, filtrarRelatorios, MAXIMO_CONCORRENTES } from "@/api/servicos/filtros-da-pesquisa";

const concorrente = (site: string, nome = "X", motivo = "m") => ({ nome, site, motivo });

describe("filtrarConcorrentes", () => {
  it("remove o domínio próprio, com www e maiúsculas", () => {
    const r = filtrarConcorrentes({ concorrentes: [concorrente("https://WWW.Minha-Loja.com.br/x"), concorrente("outra.com.br")] }, "minha-loja.com.br");
    expect(r.map((c) => c.dominio)).toEqual(["outra.com.br"]);
  });

  it("remove marketplaces e seus subdomínios, mas não domínios parecidos", () => {
    const r = filtrarConcorrentes(
      { concorrentes: [concorrente("lista.mercadolivre.com.br"), concorrente("amazon.com.br"), concorrente("meuamazon.com.br"), concorrente("youtube.com")] },
      null,
    );
    expect(r.map((c) => c.dominio)).toEqual(["meuamazon.com.br"]);
  });

  it("remove sites inválidos e repetidos", () => {
    const r = filtrarConcorrentes({ concorrentes: [concorrente("não é site"), concorrente("a.com.br"), concorrente("https://www.a.com.br/y"), concorrente("")] }, null);
    expect(r.map((c) => c.dominio)).toEqual(["a.com.br"]);
  });

  it("rejeita entradas com @ (e-mail) e IPs", () => {
    const r = filtrarConcorrentes({ concorrentes: [concorrente("mailto:a@b.com"), concorrente("a@b.com"), concorrente("1.2.3.4"), concorrente("http://10.0.0.1/x"), concorrente("ok.com.br")] }, null);
    expect(r.map((c) => c.dominio)).toEqual(["ok.com.br"]);
  });

  it("corta em 8 depois de filtrar, mantendo a ordem", () => {
    const lista = [concorrente("mercadolivre.com.br"), ...Array.from({ length: 12 }, (_, i) => concorrente(`site${i}.com.br`))];
    const r = filtrarConcorrentes({ concorrentes: lista }, null);
    expect(r).toHaveLength(MAXIMO_CONCORRENTES);
    expect(r[0]?.dominio).toBe("site0.com.br");
    expect(r[7]?.dominio).toBe("site7.com.br");
  });

  it("limita o motivo a 200 caracteres e preserva o nome", () => {
    const [c] = filtrarConcorrentes({ concorrentes: [concorrente("a.com.br", "  Loja A ", "x".repeat(300))] }, null);
    expect(c?.motivo).toHaveLength(200);
    expect(c?.nome).toBe("Loja A");
  });
});

describe("filtrarRelatorios", () => {
  const concorrentes: Concorrente[] = [
    { nome: "A", dominio: "a.com.br", motivo: "" },
    { nome: "B", dominio: "b.com.br", motivo: "" },
  ];
  const relatorio = (site: string, extra = {}) => ({
    site, lido: true, oQueVende: "tênis", promessas: ["p"], precos: ["R$ 1"], diferenciais: ["d"], pontosFracos: ["f"], fontes: ["https://a.com.br"], ...extra,
  });

  it("mantém só relatórios de concorrentes conhecidos e preenche os que faltam", () => {
    const r = filtrarRelatorios({ relatorios: [relatorio("https://www.A.com.br/"), relatorio("intruso.com.br")] }, concorrentes);
    expect(r.map((x) => x.dominio)).toEqual(["a.com.br", "b.com.br"]);
    expect(r[0]?.lido).toBe(true);
    expect(r[1]).toMatchObject({ site: "b.com.br", lido: false, oQueVende: "", promessas: [], precos: [], diferenciais: [], pontosFracos: [], fontes: [] });
  });

  it("fontes mantém só URLs http e https", () => {
    const [a] = filtrarRelatorios(
      { relatorios: [relatorio("a.com.br", { fontes: ["https://a.com.br/x", "http://a.com.br", "javascript:alert(1)", "ftp://a.com", "texto"] })] },
      concorrentes,
    );
    expect(a?.fontes).toEqual(["https://a.com.br/x", "http://a.com.br"]);
  });
});

describe("filtrarRecomendacoes", () => {
  const ideia = (texto: string, volumeMensal: number | null, extra: Partial<IdeiaDePalavra> = {}): IdeiaDePalavra => ({
    texto, volumeMensal, concorrencia: "MEDIA", lanceBaixo: 0.5, lanceAlto: 2, ...extra,
  });
  const palavra = (texto: string, correspondencia: "EXATA" | "FRASE" = "EXATA") => ({ texto, correspondencia, motivo: "porque" });
  const vazio = { negativas: [] };

  describe("com volumes disponíveis", () => {
    const volumes: Volumes = {
      disponivel: true,
      ideias: [ideia("tênis corrida", 100), ideia("tênis casual", 900, { concorrencia: "ALTA", lanceBaixo: 1, lanceAlto: 3 }), ideia("tênis já tenho", 500), ideia("x".repeat(81), 50), ideia("a b c d e f g h i j k", 50)],
    };

    it("aceita só textos das ideias (normalizado), copia dados e ordena por volume", () => {
      const r = filtrarRecomendacoes(
        { palavras: [palavra("Tênis  Corrida", "FRASE"), palavra("inventada"), palavra("tenis casual")], ...vazio },
        volumes,
        [],
      );
      expect(r.recomendadas.map((p) => p.texto)).toEqual(["tênis casual", "tênis corrida"]);
      expect(r.recomendadas[0]).toMatchObject({ correspondencia: "Exata", volumeMensal: 900, concorrencia: "ALTA", lanceBaixo: 1, lanceAlto: 3, motivo: "porque" });
      expect(r.recomendadas[1]?.correspondencia).toBe("Frase");
    });

    it("descarta existentes, longas, com muitas palavras e repetidas", () => {
      const r = filtrarRecomendacoes(
        { palavras: [palavra("tênis já tenho"), palavra("x".repeat(81)), palavra("a b c d e f g h i j k"), palavra("tênis corrida"), palavra("TENIS corrida")], ...vazio },
        volumes,
        ["Tênis Já Tenho"],
      );
      expect(r.recomendadas.map((p) => p.texto)).toEqual(["tênis corrida"]);
    });

    it("volume nulo vai para o fim", () => {
      const v: Volumes = { disponivel: true, ideias: [ideia("a b", null), ideia("c d", 5)] };
      const r = filtrarRecomendacoes({ palavras: [palavra("a b"), palavra("c d")], ...vazio }, v, []);
      expect(r.recomendadas.map((p) => p.texto)).toEqual(["c d", "a b"]);
    });
  });

  describe("sem volumes", () => {
    const volumes: Volumes = { disponivel: false, motivo: "sem acesso" };

    it("aceita os textos da IA sem repetir, com volume nulo e SEM_DADOS", () => {
      const r = filtrarRecomendacoes(
        { palavras: [palavra("tênis novo"), palavra("Tenis Novo"), palavra("já existe"), palavra("x".repeat(81)), palavra("a b c d e f g h i j k")], ...vazio },
        volumes,
        ["já existe"],
      );
      expect(r.recomendadas).toEqual([
        { texto: "tênis novo", correspondencia: "Exata", motivo: "porque", volumeMensal: null, concorrencia: "SEM_DADOS", lanceBaixo: null, lanceAlto: null },
      ]);
    });
  });

  describe("negativas", () => {
    const volumes: Volumes = { disponivel: false, motivo: "x" };

    it("tira repetidas, limita o termo a 80 caracteres e corta em 50", () => {
      const negativas = [
        { termo: "grátis", motivo: "a" },
        { termo: "GRATIS", motivo: "b" },
        { termo: "y".repeat(81), motivo: "c" },
        { termo: "  ", motivo: "d" },
        ...Array.from({ length: 60 }, (_, i) => ({ termo: `termo ${i}`, motivo: "e" })),
      ];
      const r = filtrarRecomendacoes({ palavras: [], negativas }, volumes, []);
      expect(r.negativas).toHaveLength(50);
      expect(r.negativas[0]).toEqual({ termo: "grátis", motivo: "a" });
      expect(r.negativas[1]?.termo).toBe("termo 0");
    });
  });
});
