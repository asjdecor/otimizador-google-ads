import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  criptografarTexto,
  descriptografarTexto,
  lerChaveDeCriptografia,
} from "@/api/seguranca/criptografia";

const chave = randomBytes(32);

describe("criptografia", () => {
  it("descriptografa de volta o texto original", () => {
    const token = "1//0gRefreshTokenDeExemplo-çãé";
    expect(descriptografarTexto(criptografarTexto(token, chave), chave)).toBe(token);
  });

  it("gera saída diferente a cada vez (IV aleatório) e nunca contém o texto puro", () => {
    const a = criptografarTexto("segredo", chave);
    const b = criptografarTexto("segredo", chave);
    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64").toString("utf8")).not.toContain("segredo");
  });

  it("falha com chave errada", () => {
    const cifrado = criptografarTexto("segredo", chave);
    expect(() => descriptografarTexto(cifrado, randomBytes(32))).toThrow();
  });

  it("falha se o texto foi adulterado", () => {
    const dados = Buffer.from(criptografarTexto("segredo", chave), "base64");
    dados[dados.length - 1] = (dados[dados.length - 1] ?? 0) ^ 0xff;
    expect(() => descriptografarTexto(dados.toString("base64"), chave)).toThrow();
  });

  it("falha com texto curto demais", () => {
    expect(() => descriptografarTexto("abc", chave)).toThrow("Texto criptografado inválido");
  });

  it("valida a ENCRYPTION_KEY", () => {
    expect(() => lerChaveDeCriptografia("")).toThrow("não definida");
    expect(() => lerChaveDeCriptografia(Buffer.from("curta").toString("base64"))).toThrow("32 bytes");
    expect(lerChaveDeCriptografia(chave.toString("base64")).length).toBe(32);
  });
});
