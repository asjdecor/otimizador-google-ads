// Sessão do login do app. Só usa Web Crypto (sem Buffer/node:crypto), então roda
// tanto no middleware (Edge) quanto nas rotas (Node).

export const COOKIE_SESSAO = "sessao";
export const DURACAO_DA_SESSAO_MS = 7 * 24 * 60 * 60 * 1000;
const VERSAO = "v1";

type Ambiente = Record<string, string | undefined>;

export type ConfiguracaoDeLogin =
  | { modo: "desligado" }
  | { modo: "mal-configurado"; motivo: string }
  | { modo: "ativo"; senhaHash: string; segredo: string };

/**
 * Sem APP_SENHA_HASH o login fica desligado — mas SÓ fora de produção (seu PC).
 * Em produção, faltar senha ou segredo bloqueia o app inteiro (falha fechada).
 */
export function lerConfiguracaoDeLogin(ambiente: Ambiente = process.env): ConfiguracaoDeLogin {
  const senhaHash = ambiente.APP_SENHA_HASH?.trim() ?? "";
  const segredo = ambiente.APP_SESSAO_SEGREDO?.trim() ?? "";
  const producao = ambiente.NODE_ENV === "production" || Boolean(ambiente.VERCEL);
  if (!senhaHash && !producao) return { modo: "desligado" };
  if (!senhaHash) return { modo: "mal-configurado", motivo: "APP_SENHA_HASH não configurada" };
  if (segredo.length < 32) return { modo: "mal-configurado", motivo: "APP_SESSAO_SEGREDO ausente ou curto (mín. 32 caracteres)" };
  return { modo: "ativo", senhaHash, segredo };
}

function paraBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binario = atob(texto.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** A chave inclui o hash da senha: trocar a senha desloga todas as sessões. */
async function importarChave(config: { senhaHash: string; segredo: string }): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${config.segredo}|${config.senhaHash}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Valor do cookie: "v1.<expira em ms>.<assinatura HMAC>". */
export async function criarTokenDeSessao(
  config: { senhaHash: string; segredo: string },
  agora: number = Date.now(),
): Promise<string> {
  const conteudo = `${VERSAO}.${agora + DURACAO_DA_SESSAO_MS}`;
  const assinatura = await crypto.subtle.sign("HMAC", await importarChave(config), new TextEncoder().encode(conteudo));
  return `${conteudo}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

/** Confere assinatura (tempo constante, via subtle.verify) e validade. */
export async function tokenDeSessaoEhValido(
  token: string | undefined,
  config: { senhaHash: string; segredo: string },
  agora: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 3 || partes[0] !== VERSAO) return false;
  const [versao, expira, assinaturaTexto] = partes as [string, string, string];
  const expiraEm = Number(expira);
  if (!Number.isFinite(expiraEm) || expiraEm <= agora) return false;
  const assinatura = deBase64Url(assinaturaTexto);
  if (!assinatura) return false;
  return crypto.subtle.verify(
    "HMAC",
    await importarChave(config),
    assinatura,
    new TextEncoder().encode(`${versao}.${expira}`),
  );
}

const CAMINHOS_PUBLICOS = ["/login", "/api/auth/entrar"];

export type DecisaoDeAcesso = "liberar" | "redirecionar-login" | "negar-api" | "bloquear-configuracao";

/** Regra do middleware, separada para ser testável. */
export async function decidirAcesso(
  caminho: string,
  token: string | undefined,
  config: ConfiguracaoDeLogin,
  agora: number = Date.now(),
): Promise<DecisaoDeAcesso> {
  if (config.modo === "desligado") return "liberar";
  if (config.modo === "mal-configurado") return "bloquear-configuracao";
  if (CAMINHOS_PUBLICOS.includes(caminho)) return "liberar";
  if (await tokenDeSessaoEhValido(token, config, agora)) return "liberar";
  return caminho.startsWith("/api/") ? "negar-api" : "redirecionar-login";
}

/** Só aceita voltar para caminhos internos (evita redirecionar para outro site). */
export function caminhoDeVoltaSeguro(volta: string | null | undefined): string {
  if (!volta || !volta.startsWith("/") || volta.startsWith("//") || volta.startsWith("/\\")) return "/";
  return volta;
}
