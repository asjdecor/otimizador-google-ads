import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;

/** Lê ENCRYPTION_KEY (base64, 32 bytes) e falha com mensagem clara se estiver errada. */
export function lerChaveDeCriptografia(valor: string | undefined = process.env.ENCRYPTION_KEY): Buffer {
  if (!valor) {
    throw new Error("ENCRYPTION_KEY não definida no .env");
  }
  const chave = Buffer.from(valor, "base64");
  if (chave.length !== 32) {
    throw new Error("ENCRYPTION_KEY deve ter 32 bytes em base64");
  }
  return chave;
}

/** Criptografa um texto. Formato de saída (base64): iv (12) + tag (16) + conteúdo. */
export function criptografarTexto(texto: string, chave: Buffer = lerChaveDeCriptografia()): string {
  const iv = randomBytes(TAMANHO_IV);
  const cifra = createCipheriv(ALGORITMO, chave, iv);
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return Buffer.concat([iv, tag, conteudo]).toString("base64");
}

/** Descriptografa um texto gerado por criptografarTexto. Lança erro se foi adulterado. */
export function descriptografarTexto(textoCriptografado: string, chave: Buffer = lerChaveDeCriptografia()): string {
  const dados = Buffer.from(textoCriptografado, "base64");
  if (dados.length < TAMANHO_IV + TAMANHO_TAG) {
    throw new Error("Texto criptografado inválido");
  }
  const iv = dados.subarray(0, TAMANHO_IV);
  const tag = dados.subarray(TAMANHO_IV, TAMANHO_IV + TAMANHO_TAG);
  const conteudo = dados.subarray(TAMANHO_IV + TAMANHO_TAG);
  const decifra = createDecipheriv(ALGORITMO, chave, iv);
  decifra.setAuthTag(tag);
  return Buffer.concat([decifra.update(conteudo), decifra.final()]).toString("utf8");
}
