import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/api/banco/prisma";

export const VALIDADE_DO_CACHE_MS = 15 * 60 * 1000;

/** Chave = conta + hash da consulta (o período já está dentro do GAQL). */
export function montarChaveDoCache(customerId: string, consulta: string): string {
  const consultaNormalizada = consulta.replace(/\s+/g, " ").trim();
  return `${customerId}:${createHash("sha256").update(consultaNormalizada).digest("hex")}`;
}

/**
 * Devolve o resultado guardado se ainda for válido; senão chama `buscar`, guarda e devolve.
 * `forcarAtualizacao` ignora o cache (botão "Atualizar").
 */
export async function consultarComCache<T>(
  opcoes: { chave: string; buscar: () => Promise<T>; forcarAtualizacao?: boolean; agora?: Date },
  banco: PrismaClient = prisma,
): Promise<T> {
  const agora = opcoes.agora ?? new Date();
  if (!opcoes.forcarAtualizacao) {
    const guardado = await banco.cacheConsulta.findUnique({ where: { chave: opcoes.chave } });
    if (guardado && guardado.expiraEm > agora) {
      return JSON.parse(guardado.json) as T;
    }
  }
  const resultado = await opcoes.buscar();
  const dados = { json: JSON.stringify(resultado), expiraEm: new Date(agora.getTime() + VALIDADE_DO_CACHE_MS) };
  await banco.cacheConsulta.upsert({
    where: { chave: opcoes.chave },
    create: { chave: opcoes.chave, ...dados },
    update: dados,
  });
  return resultado;
}

/** Apaga o cache de uma conta (usado pelo botão "Atualizar"). Devolve quantos itens saíram. */
export async function limparCacheDaConta(customerId: string, banco: PrismaClient = prisma): Promise<number> {
  const { count } = await banco.cacheConsulta.deleteMany({ where: { chave: { startsWith: `${customerId}:` } } });
  return count;
}
