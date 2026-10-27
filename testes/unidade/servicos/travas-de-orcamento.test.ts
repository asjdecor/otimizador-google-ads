import { describe, expect, it } from "vitest";
import { verificarOrcamento } from "@/api/servicos/travas-de-orcamento";

describe("verificarOrcamento", () => {
  it("aceita orçamento dentro dos tetos e sem campanhas ativas", () => {
    expect(verificarOrcamento({ valorDiario: 25_00, tetoPorCampanha: 100_00, tetoTotal: 500_00, somaAtivas: 0 })).toEqual({
      ok: true,
      mensagem: null,
      maximoPermitido: null,
    });
  });

  it("recusa quando o valor diário passa do teto por campanha", () => {
    const r = verificarOrcamento({ valorDiario: 150_00, tetoPorCampanha: 100_00, tetoTotal: null, somaAtivas: 0 });
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain("ultrapassa o teto por campanha");
    expect(r.maximoPermitido).toBe(100_00);
  });

  it("recusa quando a soma das campanhas ativas mais a nova campanha passa do teto total", () => {
    const r = verificarOrcamento({ valorDiario: 120_00, tetoPorCampanha: null, tetoTotal: 500_00, somaAtivas: 400_00 });
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain("ultrapassa o teto total");
    expect(r.maximoPermitido).toBe(100_00);
  });

  it("aceita limite total vazio e deixa a regra por campanha só", () => {
    expect(verificarOrcamento({ valorDiario: 80_00, tetoPorCampanha: 150_00, tetoTotal: null, somaAtivas: 0 })).toEqual({
      ok: true,
      mensagem: null,
      maximoPermitido: null,
    });
  });

  it("recusa valores não inteiros ou zero", () => {
    expect(verificarOrcamento({ valorDiario: 0, tetoPorCampanha: null, tetoTotal: null, somaAtivas: 0 })).toMatchObject({
      ok: false,
      mensagem: expect.stringContaining("maior que zero"),
    });
    expect(verificarOrcamento({ valorDiario: 99.99, tetoPorCampanha: null, tetoTotal: null, somaAtivas: 0 }).ok).toBe(false);
  });
});
