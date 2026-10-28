import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/api/banco/prisma";
import { lerMccPreferida } from "@/api/configuracao/ambiente";
import type { ApiGoogleAds } from "@/api/integracoes/google-ads/api-google-ads";
import { listarContasAcessiveis, type ContaAcessivel } from "@/api/integracoes/google-ads/contas";
import type { ProvedorOAuth, TokensDaConexao } from "@/api/integracoes/google-ads/oauth";
import { ErroParaUsuario } from "@/api/erro-para-usuario";
import { criptografarTexto, descriptografarTexto } from "@/api/seguranca/criptografia";

export interface ContaSalva {
  customerId: string;
  nome: string;
  moeda: string;
  ehGerente: boolean;
  selecionada: boolean;
  loginCustomerId: string | null;
}

export type EstadoDaConexao =
  | { conectado: false }
  | { conectado: true; email: string; contas: ContaSalva[]; contaSelecionada: ContaSalva | null };

const camposDaConta = {
  customerId: true,
  nome: true,
  moeda: true,
  ehGerente: true,
  selecionada: true,
  loginCustomerId: true,
} as const;

/** Guarda a conexão (usuário único: conectar outro e-mail substitui o anterior). */
export async function salvarConexaoGoogle(
  dados: { email: string; refreshToken: string },
  banco: PrismaClient = prisma,
): Promise<void> {
  const refreshTokenCriptografado = criptografarTexto(dados.refreshToken);
  await banco.$transaction(async (tx) => {
    const outras = await tx.conexaoGoogle.deleteMany({ where: { email: { not: dados.email } } });
    if (outras.count > 0) await tx.cacheConsulta.deleteMany({});
    await tx.conexaoGoogle.upsert({
      where: { email: dados.email },
      create: { email: dados.email, refreshTokenCriptografado },
      update: { refreshTokenCriptografado },
    });
  });
}

/** Refresh token descriptografado, ou null se não houver conexão. */
export async function lerRefreshTokenSalvo(banco: PrismaClient = prisma): Promise<string | null> {
  const conexao = await banco.conexaoGoogle.findFirst();
  return conexao ? descriptografarTexto(conexao.refreshTokenCriptografado) : null;
}

/**
 * Substitui a lista de contas salvas pela lista atual do Google.
 * Mantém a conta selecionada se ela ainda existir; senão seleciona a primeira que não é MCC.
 */
export async function sincronizarContasSalvas(contas: ContaAcessivel[], banco: PrismaClient = prisma): Promise<void> {
  const conexao = await banco.conexaoGoogle.findFirst();
  if (!conexao) throw new ErroParaUsuario("Nenhuma conta Google conectada.");

  await banco.$transaction(async (tx) => {
    const anterior = await tx.contaAds.findFirst({ where: { selecionada: true } });
    const idsAtuais = contas.map((c) => c.customerId);
    await tx.contaAds.deleteMany({ where: { customerId: { notIn: idsAtuais } } });

    const manterAnterior = anterior !== null && contas.some((c) => c.customerId === anterior.customerId && !c.ehGerente);
    const idSelecionado = manterAnterior ? anterior.customerId : (contas.find((c) => !c.ehGerente)?.customerId ?? null);

    for (const conta of contas) {
      const dados = { ...conta, selecionada: conta.customerId === idSelecionado, conexaoId: conexao.id };
      await tx.contaAds.upsert({ where: { customerId: conta.customerId }, create: dados, update: dados });
    }
  });
}

/** Busca as contas no Google e atualiza o banco. */
export async function atualizarContasDoGoogle(api: ApiGoogleAds, banco: PrismaClient = prisma): Promise<void> {
  const refreshToken = await lerRefreshTokenSalvo(banco);
  if (!refreshToken) throw new ErroParaUsuario("Nenhuma conta Google conectada.");
  await sincronizarContasSalvas(await listarContasAcessiveis(api, refreshToken, lerMccPreferida()), banco);
}

/** Fluxo completo do callback: código do Google → tokens → banco → lista de contas. */
export async function concluirConexaoGoogle(
  codigo: string,
  dependencias: { provedor: ProvedorOAuth; api: ApiGoogleAds },
  banco: PrismaClient = prisma,
): Promise<void> {
  const tokens = await dependencias.provedor.trocarCodigoPorTokens(codigo);
  await concluirConexaoGoogleComTokens(tokens, dependencias.api, banco);
}

/** Persiste tokens já validados e sincroniza contas sem trocar o código OAuth novamente. */
export async function concluirConexaoGoogleComTokens(
  tokens: TokensDaConexao,
  api: ApiGoogleAds,
  banco: PrismaClient = prisma,
): Promise<void> {
  // Salva antes de buscar as contas: se a busca falhar (ex.: acesso ainda de teste), dá para tentar de novo sem refazer o login.
  await salvarConexaoGoogle(tokens, banco);
  const contas = await listarContasAcessiveis(api, tokens.refreshToken, lerMccPreferida());
  await sincronizarContasSalvas(contas, banco);
}

/** Seleciona a conta a analisar. Contas MCC não têm anúncios, então não podem ser escolhidas. */
export async function selecionarContaAds(customerId: string, banco: PrismaClient = prisma): Promise<void> {
  const conta = await banco.contaAds.findUnique({ where: { customerId } });
  if (!conta) throw new ErroParaUsuario("Conta não encontrada. Atualize a lista de contas.");
  if (conta.ehGerente) throw new ErroParaUsuario("Contas gerentes (MCC) não têm anúncios. Escolha uma conta de anúncios.");
  await banco.$transaction([
    banco.contaAds.updateMany({ data: { selecionada: false } }),
    banco.contaAds.update({ where: { customerId }, data: { selecionada: true } }),
  ]);
}

/** Apaga conexão, contas (cascade) e cache. Devolve o refresh token para quem quiser revogá-lo. */
export async function desconectarGoogle(banco: PrismaClient = prisma): Promise<string | null> {
  const refreshToken = await lerRefreshTokenSalvo(banco);
  await banco.$transaction([banco.conexaoGoogle.deleteMany({}), banco.cacheConsulta.deleteMany({})]);
  return refreshToken;
}

export async function obterEstadoDaConexao(banco: PrismaClient = prisma): Promise<EstadoDaConexao> {
  const conexao = await banco.conexaoGoogle.findFirst({
    include: { contas: { select: camposDaConta, orderBy: { nome: "asc" } } },
  });
  if (!conexao) return { conectado: false };
  return {
    conectado: true,
    email: conexao.email,
    contas: conexao.contas,
    contaSelecionada: conexao.contas.find((c) => c.selecionada) ?? null,
  };
}
