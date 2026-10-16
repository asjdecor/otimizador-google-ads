import { describe, expect, it } from "vitest";
import { formatarData, formatarMoeda, formatarNumero, formatarPercentual } from "@/api/servicos/formatacao";
import { calcularIntervaloDoPeriodo, lerPeriodoEscolhido } from "@/api/servicos/periodo";
import { ordenarLinhas } from "@/componentes/ordenar-linhas";

describe("calcularIntervaloDoPeriodo", () => {
  it("últimos 30 dias terminam ontem e têm 30 dias", () => {
    expect(calcularIntervaloDoPeriodo(30, new Date(2026, 9, 15, 10))).toEqual({ inicio: "2026-09-15", fim: "2026-10-14" });
  });

  it("7 dias atravessando a virada do mês", () => {
    expect(calcularIntervaloDoPeriodo(7, new Date(2026, 10, 3))).toEqual({ inicio: "2026-10-27", fim: "2026-11-02" });
  });

  it("90 dias atravessando a virada do ano", () => {
    // 12/out–31/out (20) + nov (30) + dez (31) + 1–9/jan (9) = 90 dias
    expect(calcularIntervaloDoPeriodo(90, new Date(2026, 0, 10))).toEqual({ inicio: "2025-10-12", fim: "2026-01-09" });
  });
});

describe("lerPeriodoEscolhido", () => {
  it("aceita 7, 30 e 90", () => {
    expect(lerPeriodoEscolhido("7", 30)).toBe(7);
    expect(lerPeriodoEscolhido("90", 30)).toBe(90);
  });

  it("valor ausente ou inválido usa o padrão; padrão inválido usa 30", () => {
    expect(lerPeriodoEscolhido(undefined, 7)).toBe(7);
    expect(lerPeriodoEscolhido("15", 90)).toBe(90);
    expect(lerPeriodoEscolhido("abc", 12)).toBe(30);
  });
});

describe("formatação pt-BR", () => {
  it("moeda", () => {
    expect(formatarMoeda(1234.5)).toMatch(/^R\$\s1\.234,50$/);
    expect(formatarMoeda(10, "USD")).toMatch(/US\$\s10,00/);
    expect(formatarMoeda(10, "XYZINVALIDA")).toMatch(/^R\$/);
    expect(formatarMoeda(null)).toBe("—");
  });

  it("percentual, número e data", () => {
    expect(formatarPercentual(0.0345)).toMatch(/^3,45\s?%$/);
    expect(formatarPercentual(null)).toBe("—");
    expect(formatarNumero(12345)).toBe("12.345");
    expect(formatarNumero(3.456)).toBe("3,46");
    expect(formatarNumero(Number.NaN)).toBe("—");
    expect(formatarData("2026-10-14")).toBe("14/10/2026");
  });
});

describe("ordenarLinhas", () => {
  const linhas = [
    { chave: "1", nome: "Óculos", custo: 10 },
    { chave: "2", nome: "abajur", custo: null },
    { chave: "3", nome: "Banco", custo: 30 },
  ];

  it("números: desc e asc, com vazios sempre no fim", () => {
    expect(ordenarLinhas(linhas, "custo", "desc").map((l) => l.chave)).toEqual(["3", "1", "2"]);
    expect(ordenarLinhas(linhas, "custo", "asc").map((l) => l.chave)).toEqual(["1", "3", "2"]);
  });

  it("texto em ordem do português (ignora maiúsculas e acentos)", () => {
    expect(ordenarLinhas(linhas, "nome", "asc").map((l) => l.nome)).toEqual(["abajur", "Banco", "Óculos"]);
  });

  it("não altera a lista original", () => {
    ordenarLinhas(linhas, "custo", "desc");
    expect(linhas.map((l) => l.chave)).toEqual(["1", "2", "3"]);
  });
});
