import { randomBytes, timingSafeEqual } from "node:crypto";

export const COOKIE_ESTADO_OAUTH = "oauth_estado";

/** Valor aleatório que amarra o início do login ao callback (proteção contra CSRF). */
export function gerarEstadoOAuth(): string {
  return randomBytes(24).toString("base64url");
}

/** Compara o estado do callback com o do cookie em tempo constante. */
export function estadoOAuthConfere(recebido: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!recebido || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Ações (POST) só são aceitas quando vêm de uma página do próprio app. */
export function requisicaoEhDaMesmaOrigem(cabecalhos: Headers): boolean {
  const origem = cabecalhos.get("origin");
  const host = cabecalhos.get("host");
  if (!origem || !host) return false;
  try {
    return new URL(origem).host === host;
  } catch {
    return false;
  }
}
