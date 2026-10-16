import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Formato: "scrypt:<salt base64>:<hash base64>". Sem "$", porque o Next expande "$VAR" no .env.
const PARAMETROS: ScryptOptions = { N: 16384, r: 8, p: 1 };
const TAMANHO_DO_HASH = 32;

function derivar(senha: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolver, rejeitar) => {
    scrypt(senha.normalize("NFKC"), salt, TAMANHO_DO_HASH, PARAMETROS, (erro, chave) => (erro ? rejeitar(erro) : resolver(chave)));
  });
}

export async function gerarHashDeSenha(senha: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("base64")}:${(await derivar(senha, salt)).toString("base64")}`;
}

/** Compara em tempo constante. Hash em formato inválido = senha errada. */
export async function senhaConfere(senha: string, hashSalvo: string): Promise<boolean> {
  const [algoritmo, saltTexto, hashTexto] = hashSalvo.split(":");
  if (algoritmo !== "scrypt" || !saltTexto || !hashTexto) return false;
  const esperado = Buffer.from(hashTexto, "base64");
  if (esperado.length !== TAMANHO_DO_HASH) return false;
  const calculado = await derivar(senha, Buffer.from(saltTexto, "base64"));
  return timingSafeEqual(calculado, esperado);
}
